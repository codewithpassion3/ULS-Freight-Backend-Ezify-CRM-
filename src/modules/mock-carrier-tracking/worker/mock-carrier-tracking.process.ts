// src/mock-carrier-tracking/mock-tracking.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EntityManager } from '@mikro-orm/core';
import { Injectable, Logger } from '@nestjs/common';
import { TrackingEvent, TrackingEventType } from 'src/entities/mock-carrier-tracking.entity';
import { Shipment } from 'src/entities/shipment.entity';
import { TrackingEventPayload } from '../interface/mock-carrier-tracking.interface';


@Processor('mock-tracking', { concurrency: 5 })
@Injectable()
export class MockTrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(MockTrackingProcessor.name);

  constructor(private readonly em: EntityManager) {
    super();
  }

  async process(job: Job<TrackingEventPayload>): Promise<{ status: string; eventId: string }> {
    const { data: payload } = job;
    
    this.logger.log(`Processing mock event: ${payload.eventType} for ${payload.trackingNumber}`);

    return await this.em.transactional(async (em) => {
      // 1. Find shipment by tracking number
      const shipment = await em.findOne(Shipment, { trackingNumber: payload.trackingNumber });
      
      if (!shipment) {
        this.logger.error(`Shipment not found: ${payload.trackingNumber}`);
        throw new Error(`Shipment ${payload.trackingNumber} not found`);
      }

      // 2. Idempotency check
      const existing = await em.findOne(TrackingEvent, {
        shipment,
        carrierEventId: payload.eventId,
      });

      if (existing) {
        this.logger.warn(`Duplicate event ignored: ${payload.eventId}`);
        return { status: 'duplicate_ignored', eventId: payload.eventId };
      }

      // 3. Create tracking event
      const event = em.create(TrackingEvent, {
        shipment,
        carrier: payload.carrier,
        carrierEventId: payload.eventId,
        eventType: payload.eventType as TrackingEventType,
        status: payload.eventType,
        location: payload.location,
        rawPayload: payload,
        occurredAt: new Date(payload.timestamp),
        createdAt: new Date()
      });

      // 4. Update shipment current status
      shipment.currentStatus = payload.eventType;
      shipment.lastEventAt = new Date();

      // 5. Persist
      await em.persist([event, shipment]).flush();

      this.logger.log(`Event saved: ${payload.eventType} → ${payload.trackingNumber}`);

      return { status: 'processed', eventId: payload.eventId };
    });
  }
}