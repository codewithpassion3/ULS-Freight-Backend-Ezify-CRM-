import { Module } from '@nestjs/common';
import { SSEModule } from '../sse/sse.module';
import { AddressNotificationFactory } from 'src/factory/notification/address-book.factory';
import { QuoteNotificationFactory } from 'src/factory/notification/quote.factory';
import { ShipmentNotificationFactory } from 'src/factory/notification/shipment.factory';
import { NotificationService } from './service/notification.service';

@Module({
  imports: [
    SSEModule,
  ],
  providers: [
    NotificationService,
    QuoteNotificationFactory,
    ShipmentNotificationFactory,
    AddressNotificationFactory,
  ],
  exports: [
    NotificationService, 
    QuoteNotificationFactory,    
    ShipmentNotificationFactory,   
    AddressNotificationFactory,
  ],
})
export class NotificationsModule {}