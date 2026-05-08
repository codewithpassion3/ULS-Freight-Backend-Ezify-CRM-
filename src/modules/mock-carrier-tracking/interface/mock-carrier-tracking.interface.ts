import { Carrier } from "src/modules/shipment-carrier/dto/create-carrier-shipment.dto";

export interface MockEventStep {
  eventType: string;
  delayMs: number; // Delay from shipment creation
  location?: {
    city: string;
    state: string;
    country: string;
  };
}

export interface TrackingEventPayload {
  eventId: string;
  trackingNumber: string;
  carrier: Carrier;
  eventType: string;
  timestamp: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  description?: string;
  raw?: Record<string, any>;
}