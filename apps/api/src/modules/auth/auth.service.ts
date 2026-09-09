import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) return null;

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(user: { id: string; organizationId: string }) {
    const payload = { sub: user.id, orgId: user.organizationId };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}