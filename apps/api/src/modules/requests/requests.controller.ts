import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import {
  createRequestSchema,
  transitionSchema,
  assignStaffSchema,
} from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../../casl/policies.guard';
import { CheckPolicies } from '../../casl/check-policies.decorator';
import { CaslAbilityFactory } from '../../casl/casl-ability.factory';
import { RequestsService } from './requests.service';

class CreateRequestDto extends createZodDto(createRequestSchema) {}
class TransitionDto extends createZodDto(transitionSchema) {}
class AssignStaffDto extends createZodDto(assignStaffSchema) {}

@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly abilityFactory: CaslAbilityFactory,
  ) {}

  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'Request'))
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req) {
    return this.requestsService.create(
      req.user.organizationId,
      req.user.userId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/transition')
  async transition(
    @Param('id') id: string,
    @Body() body: TransitionDto,
    @Req() req,
  ) {
    if (body.toStatus === 'REOPENED') {
      const ability = await this.abilityFactory.createForUser(req.user.userId);
      if (!ability.can('reopen', 'Request')) {
        throw new ForbiddenException('Missing permission: request.reopen');
      }
      if (!body.note) {
        throw new BadRequestException(
          'A reason is required to reopen a request',
        );
      }
    }
    return this.requestsService.transition(
      req.user.organizationId,
      id,
      req.user.userId,
      body.toStatus,
      body.note,
    );
  }
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('assign', 'Request'))
  @Post(':id/assign')
  assignStaff(
    @Param('id') id: string,
    @Body() body: AssignStaffDto,
    @Req() req,
  ) {
    return this.requestsService.assignStaff(
      req.user.organizationId,
      id,
      body.staffId,
      req.user.userId,
    );
  }
}
