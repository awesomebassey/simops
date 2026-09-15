import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import IORedis from 'ioredis';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (
      process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001'
    )
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
  },
  namespace: '/live',
})
export class LiveGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server!: Server;
  private readonly subscriber = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

  async onModuleInit() {
    await this.subscriber.subscribe('simops:session-updated');
    this.subscriber.on('message', (_channel, value) => {
      const update = JSON.parse(value) as { id: string };
      this.server.to(`session:${update.id}`).emit('session.updated', update);
    });
  }

  @SubscribeMessage('watch.session')
  watchSession(@ConnectedSocket() client: Socket, @MessageBody() sessionId: string) {
    client.join(`session:${sessionId}`);
    return { watching: sessionId };
  }

  async onModuleDestroy() { await this.subscriber.quit(); }
}
