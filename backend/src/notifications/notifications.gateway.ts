import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/** Payload broadcast to web clients when a searched slot becomes available. */
export interface SlotFoundEvent {
  id: string;
  type: string;
  /** Human label for the type, e.g. "ASHGABAT VIP". */
  typeLabel: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  remaining: number;
  /** Direct link to the calendar page where the slot can be booked. */
  url: string;
}

/**
 * Socket.IO gateway. Runs on the same HTTP server as the app (port 3000) and
 * broadcasts `slot-found` events to every connected browser so the admin can
 * raise a web notification.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Broadcast a found slot to all connected clients. */
  emitSlotFound(event: SlotFoundEvent) {
    this.server?.emit('slot-found', event);
  }
}
