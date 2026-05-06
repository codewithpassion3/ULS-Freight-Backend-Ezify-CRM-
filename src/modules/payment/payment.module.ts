import { Module } from '@nestjs/common';
import { PaymentController } from './controller/payment.controller';
import { PaymentService } from './service/payment.service';
import { RequestContextService } from 'src/utils/request-context-service';

@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [PaymentService, RequestContextService],
  exports: [PaymentService], // if other modules need it
})
export class PaymentModule {}