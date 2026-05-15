// src/modules/invoice/invoice.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Invoice } from 'src/entities/invoice.entity';
import { Company } from 'src/entities/company.entity';
import { User } from 'src/entities/user.entity';
import type { SessionData } from 'express-session';
import { PaymentService } from 'src/modules/payment/service/payment.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly em: EntityManager,
    private readonly paymentService: PaymentService,
  ) {}

  async payInvoice(invoiceId: number, session: SessionData) {
    // 1) Fetch invoice scoped to current user's company
    const invoice = await this.em.findOne(Invoice, {
      id: invoiceId,
      company: this.em.getReference(Company, session.companyId as number),
    }, {
      populate: ['shipment', 'company', 'surcharges']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found or you do not have access to this resource');
    }

    if (invoice.paid) {
      throw new BadRequestException('Invoice has already been paid');
    }

    // 2) Calculate total from surcharges
    const totalAmount = invoice.surcharges.reduce((sum, s) => sum + Number(s.amount), 0);

    if (totalAmount <= 0) {
      throw new BadRequestException('Invoice has no chargeable amount');
    }

    // 3) Deduct from wallet via PaymentService (creates transaction + updates wallet)
    const transaction = await this.paymentService.deductFromWallet(session, {
      amount: totalAmount,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
    });

    // 4) Mark invoice as paid
    invoice.paid = true;
    invoice.paidBy = this.em.getReference(User, session.userId as number);

    await this.em.persist(invoice).flush();

    return {
      message: 'Invoice paid successfully',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        paid: true,
        paidAt: invoice.updatedAt,
      },
      payment: {
        transactionId: transaction.id,
        amount: totalAmount,
        currency: invoice.surcharges[0]?.currency || 'USD',
        balanceAfter: transaction.balanceAfter,
      }
    };
  }
}