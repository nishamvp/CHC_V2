import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { createCustomerSchema } from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';

class CreateCustomerDto extends createZodDto(createCustomerSchema) {}

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateCustomerDto, @Req() req) {
    return this.customersService.create(req.user.organizationId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  searchByPhone(@Query('phone') phone: string, @Req() req) {
    return this.customersService.findByPhone(req.user.organizationId, phone);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.customersService.findAllForOrg(req.user.organizationId);
  }
}
