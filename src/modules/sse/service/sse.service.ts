import { EntityManager } from "@mikro-orm/core";
import { Injectable, Logger } from "@nestjs/common";
import { UserNotification } from "src/entities/user-notification.entity";
import { ISSEClient, ISSEEvent } from "src/types/sse";
import { ConnectionRepository } from "../repository/sse.repository";
import { Response } from "express";
import { randomUUID } from "crypto";

@Injectable()
export class SSEService {
  private readonly logger = new Logger(SSEService.name);
  private readonly heartbeatInterval = 30000; // 30s

  constructor(
    private connectionRepo: ConnectionRepository,
    private em: EntityManager,
  ) {}

  //private methods
   private formatEvent(event: ISSEEvent): string {
    let output = '';
    if (event.id) output += `id: ${event.id}\n`;
    if (event.event) output += `event: ${event.event}\n`;
    if (event.retry) output += `retry: ${event.retry}\n`;
    output += `data: ${JSON.stringify(event.data)}\n\n`;
    return output;
  }

  private async sendMissedNotifications(client: ISSEClient, lastId: string): Promise<void> {
    const lastIdNum = parseInt(lastId, 10);
    if (isNaN(lastIdNum)) {
      this.logger.warn(`Invalid last-event-id format: ${lastId}`);
      return;
    }

    const missed = await this.em.find(UserNotification, {
      user: client.userId,
      id: { $gt: lastIdNum },
      read: false,
      deliveryStatus: { sse: { deliveredAt: null } }
    }, { orderBy: { id: 'asc' } }) as any;// Order by ID to maintain sequence

      // ... send to client
      for (const un of missed) {
        this.sendToClient(client, {
          id: un.id,
          event: 'notification.new',
          data: {
            notificationId: un.notification.id,
            payload: un.notification.payload
          }
        });
      }
  }

  private sendToClient(client: ISSEClient, event: ISSEEvent): void {
    client.write(this.formatEvent(event));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    );
  }
  // Called by Controller when client connects
  async handleConnection(
    res: Response, 
    userId: string, 
    companyId?: string, 
    lastEventId?: string
  ): Promise<void> {
    // In handleConnection
    const clientId = randomUUID();

    // 1. SETUP HEADERS FIRST - before any write()
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Optional: CORS headers if needed
    // res.setHeader('Access-Control-Allow-Origin', '*');
    
    res.flushHeaders();

    // 2. Define client with proper typing (avoid 'as any')
    interface SSEClient {
      id: string;
      userId: string;
      companyId?: string;
      lastEventId?: string;
      write: (data: string) => boolean;
      close: () => void;
    }

    const client: SSEClient = {
      id: clientId,
      userId,
      companyId,
      lastEventId,
      write: (data: string) => res.write(data),
      close: () => {
        if (!res.writableEnded) res.end();
      },
    };

    // 3. Add to repo after client is fully formed
    this.connectionRepo.add(client);

    // 4. Send initial connection event
    try {
      this.sendToClient(client as any, {
        id: Date.now().toString(),
        event: 'connected',
        data: { clientId },
      });
    } catch (error) {
      this.logger.error(`Failed to send initial SSE event to ${clientId}`, error);
      this.connectionRepo.remove(client as any);
      res.end();
      return;
    }

    // 5. Heartbeat with proper cleanup detection
    const heartbeat = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        clearInterval(heartbeat);
        this.connectionRepo.remove(client as any);
        return;
      }

      // SSE comment format for heartbeat (ignored by EventSource)
      const ok = res.write(':heartbeat\n\n');
      
      if (!ok) {
        // Backpressure - client not consuming fast enough
        clearInterval(heartbeat);
        this.connectionRepo.remove(client as any);
        res.end();
      }
    }, 25000);

    // 6. Cleanup handlers
    const cleanup = () => {
      clearInterval(heartbeat);
      this.connectionRepo.remove(client as any);
      if (!res.writableEnded) res.end();
    };

    res.on('close', cleanup);
    res.on('error', (err) => {
      this.logger.error(`SSE connection error for client ${clientId}`, err);
      cleanup();
    });
    res.on('timeout', cleanup);

    // 7. Keep alive without infinite Promise (better for stack traces)
    await new Promise<void>((resolve) => {
      res.on('close', resolve);
      res.on('error', resolve);
    });
  }

  // Send to specific user (all their devices/tabs)
  async sendToUser(userId: any, event: ISSEEvent): Promise<boolean> {
    const clients = this.connectionRepo.getUserConnections(userId);
    
    if (clients.length === 0) {
        return false; // User offline
    }

    const payload = this.formatEvent(event);
    let delivered = false;
    
    clients.forEach(client => {
        try {
        const success = client.write(payload);
        if (success) delivered = true;
        } catch (err) {
        this.logger.error(`Write failed for ${client.id}`, err);
        this.connectionRepo.remove(client);
        }
    });
    
    return delivered;
  }

  // Broadcast to company room
  async broadcastToRoom(roomId: string, event: ISSEEvent): Promise<void> {
    const userIds = this.connectionRepo.getRoomUserIds(roomId);
    
    // Parallel broadcast with concurrency limit to avoid blocking
    const chunks = this.chunkArray(userIds, 100);
    for (const chunk of chunks) {
      await Promise.all(
          chunk.map(userId => this.sendToUser(userId, event))
      );
    }
  }

  // Observer pattern: Subscribe to notification events
  async onNotificationCreated(userNotification: UserNotification): Promise<void> {
    const event: any = {
      id: userNotification.id,
      event: 'notification.new',
      data: {
        notificationId: userNotification.notification.id,
        type: userNotification.notification.type,
        payload: userNotification.notification.payload,
        createdAt: userNotification.createdAt
      }
    };

    await this.sendToUser(userNotification.user?.id, event);
    
    // Update delivery status
    userNotification.deliveryStatus = {
      ...userNotification.deliveryStatus,
      sse: { 
        sentAt: new Date(), 
        deliveredAt: new Date() 
      }
    };
    await this.em.flush();
  }

 
}