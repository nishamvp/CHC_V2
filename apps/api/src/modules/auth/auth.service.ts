import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { LOCK_MINUTES, MAX_FAILED_ATTEMPTS } from './auth.constants';

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
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
  private async issueTokens(userId: string, organizationId: string) {
    const accessToken = this.jwtService.sign({
      sub: userId,
      orgId: organizationId,
    });

    const refreshToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { userId, accessToken, refreshToken };
  }

  async login(user: { id: string; organizationId: string }) {
    return this.issueTokens(user.id, user.organizationId);
  }

  async refresh(userId: string, refreshToken: string) {
    const candidates = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });

    let matchedTokenId: string | null = null;
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(refreshToken, candidate.tokenHash);
      if (isMatch) {
        matchedTokenId = candidate.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: matchedTokenId } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer exists or is inactive');
    }

    return this.issueTokens(user.id, user.organizationId);
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
