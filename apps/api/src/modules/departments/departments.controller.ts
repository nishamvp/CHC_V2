import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import {
  addDepartmentMemberSchema,
  createDepartmentSchema,
} from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { DepartmentsService } from './departments.service';

class CreateDepartmentDto extends createZodDto(createDepartmentSchema) {}
class AddDepartmentMemberDto extends createZodDto(addDepartmentMemberSchema) {}

@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('manage', 'Department'))
  @Post()
  create(@Body() body: CreateDepartmentDto, @Req() req) {
    return this.departmentsService.create(
      req.user.organizationId,
      body.name,
      body.nameAr,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.departmentsService.findAllForOrg(req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('manage', 'DepartmentMembership'))
  @Post(':departmentId/members')
  addMember(
    @Param('departmentId') departmentId: string,
    @Body() body: AddDepartmentMemberDto,
    @Req() req,
  ) {
    return this.departmentsService.addMember(
      req.user.organizationId,
      departmentId,
      body,
    );
  }
}
