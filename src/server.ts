/**
 * 迷你课堂服务器
 * 基于 Socket.IO 的极简通信服务
 */

import 'dotenv/config';
import Fastify from 'fastify';
import { Server as IOServer } from 'socket.io';
import { initSocket } from './socket/index.js';

function createServer() {
  // 创建极简 Fastify 应用，仅用于承载 Socket.IO
  const app = Fastify({ logger: false });

  // 创建 Socket.IO 服务器
  const io = new IOServer(app.server, {
    cors: { origin: true },
    transports: ['websocket', 'polling']
  });
  
  // 初始化 Socket 事件处理器
  const socketHandler = initSocket(io);
  
  console.log('[极简课堂] Socket.IO 服务器已启动');

  return app;
}

async function main(): Promise<void> {
  const app = createServer();
  
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'Server listening');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
