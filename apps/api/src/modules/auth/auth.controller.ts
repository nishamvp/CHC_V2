import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@repo/shared';
import { AuthService } from './auth.service';

class LoginDto extends createZodDto(loginSchema) {}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }
}