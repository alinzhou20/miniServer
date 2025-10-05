/**
 * 迷你课堂服务器
 * 基于 Socket.IO 的极简通信服务
 */

import 'dotenv/config';
import Fastify from 'fastify';
import { Server as IOServer } from 'socket.io';
import { initSocket } from './socket/index.js';
import { initDatabase } from './data/index.js';

async function main(): Promise<void> {
  // 创建极简 Fastify 应用，仅用于承载 Socket.IO
  const app = Fastify({ logger: false });
  
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';

  // 先启动 HTTP 服务器
  await app.listen({ port, host });
  console.log(`[Server] HTTP 服务器已启动: http://${host}:${port}`);
  
  // 创建 Socket.IO 服务器，启用MessagePack解析器
  const io = new IOServer(app.server, {
    cors: { origin: true },
    transports: ['websocket', 'polling'],
  });
  
  // 初始化 Socket 事件处理器
  initSocket(io);
  console.log('[Socket] Socket.IO 服务已启动: /classroom');

  // 初始化数据库（幂等）
  await initDatabase();
  console.log('[Database] 数据库已初始化');
  
}

main();
