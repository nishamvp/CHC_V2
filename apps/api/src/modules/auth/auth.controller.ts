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
import { loginSchema, refreshSchema } from '@repo/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class LoginDto extends createZodDto(loginSchema) {}
class RefreshDto extends createZodDto(refreshSchema) {}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    return { userId, accessToken };
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
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
}
