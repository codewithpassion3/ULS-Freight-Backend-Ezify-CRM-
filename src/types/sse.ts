export interface ISSEClient {
  id: string;           // Connection ID (UUID)
  userId: number;       // Business user ID
  companyId?: number;   // For room-based subscriptions
  lastEventId?: string; // For replay
  write(data: string): boolean;
  close(): void;
}

export interface ISSEEvent {
  id?: string;          // For Last-Event-ID replay
  event?: string;       // Event type (default: "message")
  data: unknown;
  retry?: number;       // Reconnection timeout hint
}