// src/mock-carrier-tracking/mock-carrier-tracking.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MockCarrierTrackingService } from './service/mock-carrier-tracking.service';
import { MockTrackingProcessor } from './worker/mock-carrier-tracking.process';


@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mock-tracking',
    }),
  ],
  providers: [MockCarrierTrackingService, MockTrackingProcessor],
  exports: [MockCarrierTrackingService],
})
export class MockCarrierTrackingModule {}