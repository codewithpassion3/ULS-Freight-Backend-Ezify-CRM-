// src/modules/invoice/invoice.controller.ts
import { Controller, Post, Param, Session, UseGuards } from '@nestjs/common';
import type { SessionData } from 'express-session';
import { InvoiceService } from '../service/invoice.service';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';

@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @UseGuards(SessionAuthGuard)
  @Post(':id/pay')
  async pay(@Param('id') invoiceId: number, @Session() session: SessionData) {
    return this.invoiceService.payInvoice(invoiceId, session);
  }
  
}