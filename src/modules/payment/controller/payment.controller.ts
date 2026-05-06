import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Session,
} from '@nestjs/common';
import { PaymentService } from '../service/payment.service';
import { SessionAuthGuard } from 'src/guards/sessionAuth.guard';
import { EntityManager } from '@mikro-orm/postgresql';
import type { SessionData } from 'express-session';
import { CreateSetupIntentDto, SaveCardDto, ChargeCardDto } from '../dto/payment.dto';


@Controller('payments')
@UseGuards(SessionAuthGuard)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly em: EntityManager,
  ) {}

  @Post('setup-intent')
  async createSetupIntent(@Body() dto: CreateSetupIntentDto) {
    const setupIntent = await this.paymentService.createSetupIntent(dto.customerId);
    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  @Post('customers')
  async createCustomer(@Session() session: SessionData) {
    return this.paymentService.createCustomer(session);
  }

  @Get('my-cards')
  async listCards(@Session() session: SessionData) {
    const cards = await this.paymentService.listCards(session);
    return cards.map((card) => ({
      id: card.id,
      brand: card.card?.brand,
      last4: card.card?.last4,
      expMonth: card.card?.exp_month,
      expYear: card.card?.exp_year,
    }));
  }

  @Post('cards')
  async saveCard(@Body() dto: SaveCardDto, @Session() session: SessionData) {
    return this.paymentService.saveCard(session, dto.paymentMethodId);
  }

  @Get('saved-cards')
  async listSavedCards(@Session() session: SessionData) {
    return this.paymentService.listSavedCards(session);
  }

  @Get('wallet')
  async getWallet(@Session() session: SessionData) {
    const ctx = await this.paymentService['requestContextService'].resolve({ session, em: this.em });
    const wallet = await this.em.findOne('Wallet' as any, { user: ctx.user }) as any;
    if (!wallet) return { balance: 0, totalDeposited: 0 };
    return {
      balance: wallet.balance,
      totalDeposited: wallet.totalDeposited,
      updatedAt: wallet.updatedAt,
    };
  }

  @Post('charge')
  async chargeCard(
    @Body() dto: ChargeCardDto,
    @Session() session: SessionData,
  ) {
    return this.paymentService.chargeSavedCard(session, {
      cardId: dto.cardId,
      amountCents: dto.amount,
      currency: dto.currency,
    });
  }

  @Delete('cards/:paymentMethodId')
  async removeCard(@Param('paymentMethodId') paymentMethodId: string) {
    await this.paymentService.detachCard(paymentMethodId);
    return { message: 'Card removed successfully' };
  }
}