import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrackingEventPayload } from '../interface/mock-carrier-tracking.interface';
import { Carrier } from 'src/modules/shipment-carrier/dto/create-carrier-shipment.dto';
import { ENV } from 'src/common/constants/env';
import { getEnv } from 'src/utils/getEnv';

type StepTemplate = {
  eventType: string;
  location: { city: string; state: string; country: string };
  minDelayMs: number; // minimum time after the *previous* event
  maxDelayMs: number; // maximum time after the *previous* event
};

@Injectable()
export class MockCarrierTrackingService {
  constructor(
    @InjectQueue('mock-tracking') private mockQueue: Queue,
  ) {}

  async scheduleTrackingTimeline(
    carrier: Carrier,
    trackingNumber: string,
    scenario: 'standard_delivery' | 'failed_delivery' | 'express' = 'standard_delivery',
  ): Promise<void> {
    const templates = this.getScenarioTemplates(scenario);
    const compression = this.getCompression();

    let cumulativeMs = 0;

    for (const template of templates) {
      // Each leg rolls its own dice for this specific shipment
      const legDelayMs = this.randomBetween(template.minDelayMs, template.maxDelayMs) / compression;
      cumulativeMs += legDelayMs;

      const payload: TrackingEventPayload = {
        eventId: `${carrier}-${trackingNumber}-${template.eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingNumber,
        carrier,
        eventType: template.eventType,
        timestamp: new Date(Date.now() + cumulativeMs).toISOString(),
        location: template.location,
        description: this.getDescription(template.eventType),
      };

      await this.mockQueue.add('process-mock-event', payload, {
        delay: cumulativeMs,
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { age: 3600 },
        jobId: `${trackingNumber}-${template.eventType}-${Date.now()}`,
      });
    }
  }

  private getScenarioTemplates(scenario: string): StepTemplate[] {
    const hour = 60 * 60 * 1000;

    const scenarios: Record<string, StepTemplate[]> = {
      standard_delivery: [
        { eventType: 'SHIPMENT_CREATED',    location: { city: 'Toronto',     state: 'ON', country: 'CA' }, minDelayMs: 0,           maxDelayMs: 0 },
        { eventType: 'PICKUP',              location: { city: 'Toronto',     state: 'ON', country: 'CA' }, minDelayMs: 30 * 60 * 1000, maxDelayMs: 48 * hour },
        { eventType: 'IN_TRANSIT',          location: { city: 'Mississauga', state: 'ON', country: 'CA' }, minDelayMs: 2 * hour,     maxDelayMs: 72 * hour },
        { eventType: 'ARRIVED_AT_FACILITY', location: { city: 'Montreal',    state: 'QC', country: 'CA' }, minDelayMs: 4 * hour,     maxDelayMs: 24 * hour },
        { eventType: 'OUT_FOR_DELIVERY',    location: { city: 'Montreal',    state: 'QC', country: 'CA' }, minDelayMs: 2 * hour,     maxDelayMs: 12 * hour },
        { eventType: 'DELIVERED',           location: { city: 'Montreal',    state: 'QC', country: 'CA' }, minDelayMs: 15 * 60 * 1000, maxDelayMs: 6 * hour },
      ],
      failed_delivery: [
        { eventType: 'SHIPMENT_CREATED', location: { city: 'Toronto',     state: 'ON', country: 'CA' }, minDelayMs: 0,           maxDelayMs: 0 },
        { eventType: 'PICKUP',           location: { city: 'Toronto',     state: 'ON', country: 'CA' }, minDelayMs: 30 * 60 * 1000, maxDelayMs: 48 * hour },
        { eventType: 'IN_TRANSIT',       location: { city: 'Mississauga', state: 'ON', country: 'CA' }, minDelayMs: 2 * hour,     maxDelayMs: 72 * hour },
        { eventType: 'OUT_FOR_DELIVERY', location: { city: 'Montreal',    state: 'QC', country: 'CA' }, minDelayMs: 2 * hour,     maxDelayMs: 24 * hour },
        { eventType: 'EXCEPTION',        location: { city: 'Montreal',    state: 'QC', country: 'CA' }, minDelayMs: 1 * hour,     maxDelayMs: 8 * hour },
      ],
      express: [
        { eventType: 'SHIPMENT_CREATED', location: { city: 'Toronto', state: 'ON', country: 'CA' }, minDelayMs: 0,           maxDelayMs: 0 },
        { eventType: 'PICKUP',           location: { city: 'Toronto', state: 'ON', country: 'CA' }, minDelayMs: 15 * 60 * 1000, maxDelayMs: 2 * hour },
        { eventType: 'IN_TRANSIT',         location: { city: 'Ottawa',  state: 'ON', country: 'CA' }, minDelayMs: 30 * 60 * 1000, maxDelayMs: 2 * hour },
        { eventType: 'DELIVERED',          location: { city: 'Ottawa',  state: 'ON', country: 'CA' }, minDelayMs: 30 * 60 * 1000, maxDelayMs: 2 * hour },
      ],
    };

    return scenarios[scenario] || scenarios.standard_delivery;
  }

  private randomBetween(min: number, max: number): number {
    return Math.round(min + Math.random() * (max - min));
  }

  private getCompression(): number {
    return parseInt(getEnv(ENV.MOCK_TRACKING_TIME_COMPRESSION), 10) || 1;
  }

  private getDescription(eventType: string): string {
    const descriptions: Record<string, string> = {
      SHIPMENT_CREATED: 'Shipment information sent to carrier',
      PICKUP: 'Picked up by carrier',
      IN_TRANSIT: 'In transit to next facility',
      ARRIVED_AT_FACILITY: 'Arrived at sorting facility',
      OUT_FOR_DELIVERY: 'Out for delivery',
      DELIVERED: 'Delivered - Signed for by recipient',
      EXCEPTION: 'Delivery exception - Address not found',
    };
    return descriptions[eventType] || eventType;
  }
}