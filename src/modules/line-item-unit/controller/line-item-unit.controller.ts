

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Session } from '@nestjs/common';
import { LineItemUnitService } from 'src/modules/line-item-unit/service/line-item-unit.service';
import { CreateLineItemUnitDTO } from 'src/modules/line-item-unit/dto/create-line-item-unit.dto';
import { UpdateLineItemUnitDTO } from 'src/modules/line-item-unit/dto/update-line-item-unit.dto';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';
import { CurrentUser } from 'src/decorators/currentUser.decorator';
import type { SessionData } from 'express-session';

export interface GetAllAgainstCurrentUserQueryParams {
    page?: number;
    limit?: number;
    search?: number;
    lineItemId?: number;
    type?: string;
}

@Controller('line-item-units')
export class LineItemUnitController {
  constructor(private readonly service: LineItemUnitService) {}

  @UseGuards(SessionAuthGuard)
  @Post("/")
  async create(@Body() dto: CreateLineItemUnitDTO, @Session() session: SessionData) {
    return this.service.create(dto, session);
  }

  @UseGuards(SessionAuthGuard)
  @Get("/")
  async GetAllAgainstCurrentUserCompany(@Query() queryParams: Record<keyof GetAllAgainstCurrentUserQueryParams, any>, @Session() session: SessionData) {
    return this.service.getAllAgainstCurrentUserCompany(queryParams, session);
  }

  @UseGuards(SessionAuthGuard)
  @Get("/:id")
  async GetSingleAgainstCurrentUserCompany(@Param('id') id: number, @Session() session: SessionData) {
    return this.service.getOneAgainstCurrentUserCompany(id, session);
  }

  @UseGuards(SessionAuthGuard)
  @Patch("/:id")
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLineItemUnitDTO,
    @Session() session: SessionData
  ) {
    return this.service.updateOneAgainstCurrentUserCompany(id, dto, session);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number, @Session() session: SessionData) {
    return this.service.deleteOneAgainstCurrentUserCompany(id, session);
  }
}