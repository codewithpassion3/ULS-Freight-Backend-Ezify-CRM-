// src/modules/invoice/invoice.controller.ts
import { Controller, Post, Param, Session, UseGuards, Get, Query } from '@nestjs/common';
import type { SessionData } from 'express-session';
import { InvoiceService } from '../service/invoice.service';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';
import { GetAllInvoicesQueryParams } from '../dto/get-all-invoices.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(SessionAuthGuard)
  @Post(':id/pay')
  async Pay(@Param('id') invoiceId: number, @Session() session: SessionData) {
    return this.invoiceService.payInvoice(invoiceId, session);
  }
  
  @UseGuards(SessionAuthGuard)
  @Get('/')
  async GetAllInvoicesAgainstCurrentUserCompany(
    @Query() query: GetAllInvoicesQueryParams,
    @Session() session: SessionData,
  ) {
    return this.invoiceService.getAllInvoicesAgainstCurrentUserCompany(session, query);
  }
}