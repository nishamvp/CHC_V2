import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { changePasswordSchema, loginSchema, refreshSchema } from '@repo/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AllowWhenPasswordChangeRequired } from './decorators/allow-password-change.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

class LoginDto extends createZodDto(loginSchema) {}
class RefreshDto extends createZodDto(refreshSchema) {}
class ChangePasswordDto extends createZodDto(changePasswordSchema) {}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { userId, accessToken, refreshToken } =
      await this.authService.login(user);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { userId, accessToken, mustChangePassword: user.mustChangePassword };
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { userId, accessToken, refreshToken } =
      await this.authService.refresh(dto.userId, dto.refreshToken);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { userId, accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @AllowWhenPasswordChangeRequired()
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
  @ApiBearerAuth()
  @AllowWhenPasswordChangeRequired()
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
    // Keep this device signed in with a fresh session; all other sessions ended above
    const { userId, accessToken, refreshToken } =
      await this.authService.login(user);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { userId, accessToken, mustChangePassword: false };
  }
}
