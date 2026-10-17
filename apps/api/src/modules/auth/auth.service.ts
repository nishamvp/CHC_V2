import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import {
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  MAX_SESSIONS_PER_USER,
  REFRESH_TOKEN_DAYS,
  REUSE_GRACE_SECONDS,
  USED_TOKEN_KEEP_HOURS,
} from './auth.constants';
import { Prisma } from '@prisma/client';
import { DUMMY_HASH, safeEqual, sha256 } from './auth.utils';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user || !user.isActive) {
      await bcrypt.compare(password, DUMMY_HASH);
      return null;
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      await bcrypt.compare(password, DUMMY_HASH);
      return null; // still locked
    }

    if (user.lockedUntil) {
      // The lock has ended, so start counting from zero again
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });

      if (updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
          },
        });
      }
      return null;
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0 },
      });
    }

    const { passwordHash, failedLoginAttempts, lockedUntil, ...safeUser } =
      user;
    return safeUser;
  }

  async login(user: { id: string; organizationId: string }) {
    return this.issueTokens(user.id, user.organizationId);
  }
  private async issueTokens(
    userId: string,
    organizationId: string,
    options: { familyId?: string; tx?: Prisma.TransactionClient } = {},
  ) {
    const db: Prisma.TransactionClient = options.tx ?? this.prisma;
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');

    await db.refreshToken.create({
      data: {
        id,
        userId,
        familyId: options.familyId ?? crypto.randomUUID(),
        tokenHash: sha256(secret),
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });
    await this.pruneSessions(db, userId);

    const accessToken = this.jwtService.sign({
      sub: userId,
      orgId: organizationId,
    });
    return { userId, accessToken, refreshToken: `${id}.${secret}` };
  }

  private async pruneSessions(db: Prisma.TransactionClient, userId: string) {
    const usedCutoff = new Date(
      Date.now() - USED_TOKEN_KEEP_HOURS * 60 * 60 * 1000,
    );

    // Expired sessions, and used tokens older than the detection window
    await db.refreshToken.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { lt: usedCutoff } }],
      },
    });

    // Keep only the newest sessions
    const active = await db.refreshToken.findMany({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const extra = active.slice(MAX_SESSIONS_PER_USER).map((s) => s.id);
    if (extra.length) {
      await db.refreshToken.deleteMany({ where: { id: { in: extra } } });
    }
  }

  async refresh(rawToken: string | undefined) {
    const invalid = () =>
      new UnauthorizedException('Invalid or expired refresh token');
    if (!rawToken) throw invalid();

    const [id, secret] = rawToken.split('.');
    if (!id || !secret) throw invalid();

    // Decide inside the transaction, throw after it. A throw would undo the cleanup.
    const outcome = await this.prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { id },
        include: { user: { select: { organizationId: true, isActive: true } } },
      });
      if (!stored || !safeEqual(sha256(secret), stored.tokenHash)) {
        return { ok: false as const };
      }

      if (stored.usedAt) {
        const secondsAgo = (Date.now() - stored.usedAt.getTime()) / 1000;
        if (secondsAgo > REUSE_GRACE_SECONDS) {
          // Used earlier and shown again later: treat as stolen, end this device's chain
          await tx.refreshToken.deleteMany({
            where: { familyId: stored.familyId },
          });
        }
        return { ok: false as const };
      }

      if (stored.expiresAt < new Date() || !stored.user.isActive) {
        return { ok: false as const };
      }

      // Claim the token. If two requests race, only one gets count === 1.
      const claimed = await tx.refreshToken.updateMany({
        where: { id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        return { ok: false as const };
      }

      const tokens = await this.issueTokens(
        stored.userId,
        stored.user.organizationId,
        {
          familyId: stored.familyId,
          tx,
        },
      );
      return { ok: true as const, tokens };
    });

    if (!outcome.ok) throw invalid();
    return outcome.tokens;
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const [id, secret] = rawToken.split('.');
    if (!id || !secret) return;

    const stored = await this.prisma.refreshToken.findUnique({ where: { id } });
    // Needs the real secret, so nobody can end sessions by guessing ids
    if (!stored || !safeEqual(sha256(secret), stored.tokenHash)) return;

    await this.prisma.refreshToken.deleteMany({
      where: { familyId: stored.familyId },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const currentIsCorrect = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!currentIsCorrect) {
      throw new BadRequestException('Current password is incorrect');
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new BadRequestException(
        'The new password must be different from the current one',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // End every session, so anyone holding an old refresh token is signed out
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    return { id: user.id, organizationId: user.organizationId };
  }
}
