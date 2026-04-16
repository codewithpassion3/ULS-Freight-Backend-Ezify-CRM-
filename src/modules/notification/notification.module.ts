import { Module } from '@nestjs/common';
import { SSEModule } from '../sse/sse.module';
import { AddressBookNotificationFactory } from 'src/factory/notification/address-book.factory';
import { QuoteNotificationFactory } from 'src/factory/notification/quote.factory';
import { ShipmentNotificationFactory } from 'src/factory/notification/shipment.factory';
import { NotificationService } from './service/notification.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationListener } from './listeners/notification.listener';

@Module({
  imports: [
    SSEModule,
    EventEmitterModule.forRoot()
  ],
  providers: [
    NotificationService,
    NotificationListener,
    QuoteNotificationFactory,
    ShipmentNotificationFactory,
    AddressBookNotificationFactory,
  ],
  exports: [
    NotificationService, 
    QuoteNotificationFactory,    
    ShipmentNotificationFactory,   
    AddressBookNotificationFactory,
  ],
})
export class NotificationsModule {}