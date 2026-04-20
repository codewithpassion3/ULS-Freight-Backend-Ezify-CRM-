import { Injectable } from "@nestjs/common";
import { ISSEClient } from "src/types/sse";

@Injectable()
export class ConnectionRepository {
  // UserId -> Connections (user can have multiple tabs/devices)
  private connections = new Map<number, Set<ISSEClient>>();
  
  // Room -> Users (for company-wide broadcasts)
  private rooms = new Map<any, Set<any>>();

  add(client: any): void {
    if (!this.connections.has(client.userId)) {
      this.connections.set(client.userId, new Set());
    }
    this.connections.get(client.userId)!.add(client);
    
    // Auto-subscribe to company room if provided
    if (client.companyId) {
      this.joinRoom(client.companyId, client.userId);
    }
  }

  remove(client: ISSEClient): void {
    const userConns = this.connections.get(client.userId);
    if (userConns) {
      userConns.delete(client);
      if (userConns.size === 0) this.connections.delete(client.userId);
    }
    
    if (client.companyId) {
      this.leaveRoom(client.companyId, client.userId);
    }
  }

  // Get all connections for a specific user
  getUserConnections(userId: number): ISSEClient[] {
    return Array.from(this.connections.get(userId) || []);
  }

  // Get all users in a room
  getRoomUserIds(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }

  joinRoom(roomId: string, userId: string): void {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId)!.add(userId);
  }

  leaveRoom(roomId: number, userId: number): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getStats() {
    return {
      totalUsers: this.connections.size,
      totalConnections: Array.from(this.connections.values())
        .reduce((sum, set) => sum + set.size, 0),
      rooms: this.rooms.size
    };
  }
}