

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LineItemUnitService } from 'src/modules/line-item-unit/service/line-item-unit.service';
import { CreateLineItemUnitDTO } from 'src/modules/line-item-unit/dto/create-line-item-unit.dto';
import { UpdateLineItemUnitDTO } from 'src/modules/line-item-unit/dto/update-line-item-unit.dto';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';
import { CurrentUser } from 'src/decorators/currentUser.decorator';

export interface GetAllAgainstCurrentUserQueryParams {
    page?: number;
    limit?: number;
    search?: number;
    lineItemId?: number;
}

@Controller('line-item-units')
export class LineItemUnitController {
  constructor(private readonly service: LineItemUnitService) {}

  @UseGuards(SessionAuthGuard)
  @Post("/")
  async create(@Body() dto: CreateLineItemUnitDTO, @CurrentUser() currentUserId: number) {
    return this.service.create(dto, currentUserId);
  }

  @UseGuards(SessionAuthGuard)
  @Get("/")
  async GetAllAgainstCurrentUser(@Query('lineItemId') queryParams: Record<keyof GetAllAgainstCurrentUserQueryParams, any>, @CurrentUser() currentUserId: number) {
    return this.service.getAllAgainstCurrentUser(queryParams, currentUserId);
  }

  @UseGuards(SessionAuthGuard)
  @Get("/:id")
  async GetSingleAgainstCurrentUser(@Param('id') id: number, @CurrentUser() currentUserId: number) {
    return this.service.getOneAgainstCurrentUser(id, currentUserId);
  }

  @UseGuards(SessionAuthGuard)
  @Patch("/:id")
  async update(
    @Param('id') id: number,
    @Body() dto: UpdateLineItemUnitDTO,
    @CurrentUser() currentUserId: number
  ) {
    return this.service.updateOneAgainstCurrentUser(id, dto, currentUserId);
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: number, @CurrentUser() currentUserId: number) {
    return this.service.deleteOneAgainstCurrentUser(id, currentUserId);
  }
}