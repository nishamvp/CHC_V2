import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { createUserSchema } from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { UsersService } from './users.service';
import { ApiBearerAuth } from '@nestjs/swagger';

class CreateUserDto extends createZodDto(createUserSchema) {}

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  @Post()
  create(@Body() body: CreateUserDto, @Req() req) {
    return this.usersService.create(req.user.organizationId, body);
  }

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('manage', 'User'))
  @Get()
  findAll(@Req() req) {
    return this.usersService.findAllForOrg(req.user.organizationId);
  }
}
