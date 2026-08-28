import { Injectable } from "@nestjs/common";
import type { Server as HttpServer, IncomingMessage } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { createClient, type RedisClientType } from "redis";
import { AuthService } from "../services/auth.service";

export type RealtimeEvent =
  | "notification:new" | "notification:read" | "conversation:newMessage"
  | "conversation:typing" | "conversation:read" | "offer:counter"
  | "offer:accepted" | "offer:rejected" | "purchaseOrder:created"
  | "purchaseOrder:accepted" | "purchaseOrder:rejected"
  | "purchaseOrder:deliveryUpdated" | "purchaseOrder:paymentPrepared" | "purchaseOrder:paymentCreated" | "purchaseOrder:paymentReceived"
  | "purchaseOrder:receiptUploaded" | "dashboard:update";

type Client = { socket: WebSocket; userId: string; organizationId?: number | null; rooms: Set<string> };

/**
 * Authenticated, room-scoped WebSocket transport.  It deliberately has no
 * domain writes: REST/GraphQL transactions finish first, then services emit.
 */
@Injectable()
export class RealtimeGateway {
  private server?: WebSocketServer;
  private readonly clients = new Set<Client>();
  private publisher?: RedisClientType;
  private subscriber?: RedisClientType;
  private readonly bridgeId = `web-${process.pid}-${Math.random().toString(36).slice(2)}`;

  constructor(private readonly auth: AuthService) {}

  attach(httpServer: HttpServer) {
    if (this.server) return;
    void this.connectBridge();
    this.server = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url || "/", "http://localhost");
      if (url.pathname !== "/realtime") return;
      const token = url.searchParams.get("token") || "";
      const agent = this.auth.verifyAgentAccessToken(token);
      const user = this.auth.verifyAccessToken(token);
      if (!agent && !user) return socket.destroy();
      this.server!.handleUpgrade(request, socket, head, (ws) => {
        const client: Client = {
          socket: ws,
          userId: agent?.agent_id || String(user!.user_id),
          organizationId: agent?.organization_id ?? null,
          rooms: new Set([`user:${agent?.agent_id || user!.user_id}`]),
        };
        if (client.organizationId != null) client.rooms.add(`org:${client.organizationId}`);
        this.clients.add(client);
        if (process.env.NODE_ENV === "development") console.log(`[RealtimeGateway] CONNECTED user:${client.userId} rooms=${[...client.rooms].join(",")}`);
        ws.on("message", (raw) => this.onMessage(client, raw.toString()));
        ws.on("close", () => this.clients.delete(client));
        this.send(client, "socket:ready", { rooms: [...client.rooms] });
      });
    });
  }

  emitToUser(userId: string | number, event: RealtimeEvent, payload: unknown) { this.emit(`user:${userId}`, event, payload); }
  emitToOrganization(orgId: string | number, event: RealtimeEvent, payload: unknown) { this.emit(`org:${orgId}`, event, payload); }
  emitToConversation(conversationId: string, event: RealtimeEvent, payload: unknown) { this.emit(`conversation:${conversationId}`, event, payload); }

  private emit(room: string, event: RealtimeEvent, payload: unknown) {
    for (const client of this.clients) if (client.rooms.has(room)) this.send(client, event, payload);
    if (this.publisher?.isOpen) {
      if (process.env.NODE_ENV === "development") console.log(`[RealtimeGateway] REDIS PUBLISH room=${room} event=${event}`);
      void this.publisher.publish("kompra:realtime", JSON.stringify({ source: this.bridgeId, room, event, payload }));
    }
  }

  private async connectBridge() {
    try {
      this.publisher = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
      this.subscriber = this.publisher.duplicate();
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      await this.subscriber.subscribe("kompra:realtime", (raw) => {
        try {
          const message = JSON.parse(raw);
          if (message.source !== this.bridgeId) {
            if (process.env.NODE_ENV === "development") console.log(`[RealtimeGateway] REDIS RECEIVE room=${message.room} event=${message.event}`);
            this.emitLocal(message.room, message.event, message.payload);
          }
        } catch {}
      });
    } catch { this.publisher = undefined; this.subscriber = undefined; }
  }
  private emitLocal(room: string, event: string, payload: unknown) { for (const client of this.clients) if (client.rooms.has(room)) this.send(client, event, payload); }

  private onMessage(client: Client, raw: string) {
    try {
      const { event, conversationId, payload } = JSON.parse(raw) as { event?: string; conversationId?: string; payload?: unknown };
      if (event === "conversation:join" && conversationId) client.rooms.add(`conversation:${conversationId}`);
      if (event === "conversation:leave" && conversationId) client.rooms.delete(`conversation:${conversationId}`);
      // Typing is ephemeral and never accepted as a persisted message.
      if ((event === "typing:start" || event === "typing:stop") && conversationId) {
        this.emitToConversation(conversationId, "conversation:typing", { conversationId, state: event === "typing:start" ? "start" : "stop", userId: client.userId, payload });
      }
    } catch { /* ignore malformed client frames */ }
  }

  private send(client: Client, event: string, payload: unknown) {
    if (client.socket.readyState === WebSocket.OPEN) client.socket.send(JSON.stringify({ event, payload }));
  }
}
