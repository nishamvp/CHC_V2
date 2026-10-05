import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { createCommentSchema } from '@repo/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommentsService } from './comments.service';

class CreateCommentDto extends createZodDto(createCommentSchema) {}

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() body: CreateCommentDto, @Req() req) {
    return this.commentsService.create(
      req.user.organizationId,
      req.user.userId,
      body,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-request/:requestId')
  findByRequest(@Param('requestId') requestId: string, @Req() req) {
    return this.commentsService.findByRequest(
      req.user.organizationId,
      requestId,
    );
  }
}
