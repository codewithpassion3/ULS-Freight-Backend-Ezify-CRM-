// src/mock-carrier-tracking/mock-carrier-tracking.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrackingEventPayload } from '../interface/mock-carrier-tracking.interface';
import { Carrier } from 'src/modules/shipment-carrier/dto/create-carrier-shipment.dto'
import { ENV } from 'src/common/constants/env';
import { getEnv } from 'src/utils/getEnv';

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
    const steps = this.getScenarioSteps(scenario);

    // Dynamic: ~1 in 3 shipments get a delayed pickup for pickup-dashboard testing
    const isPickupDelayed = Math.random() < (1 / 3);
    const pickupDelayMs = isPickupDelayed ? this.getRandomPickupDelay() : 0;

    for (const step of steps) {
      // Keep SHIPMENT_CREATED on time so the shipment appears on the dashboard;
      // delay PICKUP and everything after it
      const offsetMs = step.eventType === 'SHIPMENT_CREATED' ? 0 : pickupDelayMs;
      const totalDelayMs = step.delayMs + offsetMs;

      const payload: TrackingEventPayload = {
        eventId: `${carrier}-${trackingNumber}-${step.eventType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        trackingNumber,
        carrier,
        eventType: step.eventType,
        timestamp: new Date(Date.now() + totalDelayMs).toISOString(),
        location: step.location,
        description: this.getDescription(step.eventType),
      };

      await this.mockQueue.add('process-mock-event', payload, {
        delay: totalDelayMs,
        attempts: 3,
        backoff: { type: 'fixed', delay: 5000 },
        removeOnComplete: { age: 3600 },
        jobId: `${trackingNumber}-${step.eventType}`,
      });
    }
  }

  private getScenarioSteps(scenario: string) {
    const compression = parseInt(getEnv(ENV.MOCK_TRACKING_TIME_COMPRESSION), 10) || 1;
    const hour = 60 * 60 * 1000 / compression;

    const scenarios = {
      standard_delivery: [
        { eventType: 'SHIPMENT_CREATED', delayMs: 0, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'PICKUP', delayMs: 2 * hour, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'IN_TRANSIT', delayMs: 6 * hour, location: { city: 'Mississauga', state: 'ON', country: 'CA' } },
        { eventType: 'ARRIVED_AT_FACILITY', delayMs: 14 * hour, location: { city: 'Montreal', state: 'QC', country: 'CA' } },
        { eventType: 'OUT_FOR_DELIVERY', delayMs: 24 * hour, location: { city: 'Montreal', state: 'QC', country: 'CA' } },
        { eventType: 'DELIVERED', delayMs: 26 * hour, location: { city: 'Montreal', state: 'QC', country: 'CA' } },
      ],
      failed_delivery: [
        { eventType: 'SHIPMENT_CREATED', delayMs: 0, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'PICKUP', delayMs: 2 * hour, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'IN_TRANSIT', delayMs: 6 * hour, location: { city: 'Mississauga', state: 'ON', country: 'CA' } },
        { eventType: 'OUT_FOR_DELIVERY', delayMs: 24 * hour, location: { city: 'Montreal', state: 'QC', country: 'CA' } },
        { eventType: 'EXCEPTION', delayMs: 28 * hour, location: { city: 'Montreal', state: 'QC', country: 'CA' } },
      ],
      express: [
        { eventType: 'SHIPMENT_CREATED', delayMs: 0, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'PICKUP', delayMs: 30 * 60 * 1000, location: { city: 'Toronto', state: 'ON', country: 'CA' } },
        { eventType: 'IN_TRANSIT', delayMs: 2 * hour, location: { city: 'Ottawa', state: 'ON', country: 'CA' } },
        { eventType: 'DELIVERED', delayMs: 6 * hour, location: { city: 'Ottawa', state: 'ON', country: 'CA' } },
      ],
    };

    return scenarios[scenario] || scenarios.standard_delivery;
  }

  /**
   * Returns a random delay between 24 and 72 simulated hours,
   * respecting the MOCK_TRACKING_TIME_COMPRESSION factor.
   */
  private getRandomPickupDelay(): number {
    const compression = parseInt(getEnv(ENV.MOCK_TRACKING_TIME_COMPRESSION), 10) || 1;
    const hour = 60 * 60 * 1000 / compression;

    const minHours = 24;
    const maxHours = 72;
    const randomHours = minHours + Math.random() * (maxHours - minHours);

    return Math.round(randomHours * hour);
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