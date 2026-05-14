// src/modules/surcharge/surcharge.controller.ts
import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards, Session } from '@nestjs/common';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';
import { CreateSurchargeDto } from '../dto/create-surcharge.dto';
import { SurchargeService } from '../service/surcharge.service';
import type { SessionData } from 'express-session';



@Controller('surcharges')
export class SurchargeController {
  constructor(private readonly surchargeService: SurchargeService) {}

  @Post("/")
  @UseGuards(SessionAuthGuard)
  async create(@Body() dto: CreateSurchargeDto, @Session() session: SessionData) {
    return this.surchargeService.create(dto, session);
  }
}