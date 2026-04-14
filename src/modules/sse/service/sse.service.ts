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
    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*'
    });

    const client: any = {
      id: randomUUID(),
      userId,
      companyId,
      lastEventId,
      write: (data) => res.write(data),
      close: () => res.end()
    };

    // 1. Register connection
    this.connectionRepo.add(client);
    this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

    // 2. Send missed notifications if reconnecting (Last-Event-ID)
    if (lastEventId) {
      await this.sendMissedNotifications(client, lastEventId);
    }

    // 3. Send connection established event
    this.sendToClient(client, {
      id: Date.now().toString(),
      event: 'connected',
      data: { clientId: client.id, timestamp: new Date() }
    });

    // 4. Setup heartbeat to detect zombies
    const heartbeat = setInterval(() => {
      const success = res.write(':heartbeat\n\n'); // Comment line = heartbeat
      if (!success) {
        this.logger.warn(`Backpressure detected for client ${client.id}`);
      }
    }, this.heartbeatInterval);

    // 5. Cleanup on disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      this.connectionRepo.remove(client);
      this.logger.log(`Client disconnected: ${client.id}`);
    });

    res.on('error', (err) => {
      this.logger.error(`SSE error for ${client.id}:`, err);
      clearInterval(heartbeat);
      this.connectionRepo.remove(client);
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