/**
 * 迷你课堂服务器启动文件
 * 
 * 负责：
 * - 加载环境变量配置
 * - 初始化 Fastify 应用
 * - 配置 Socket.IO 实时通信
 * - 启动 HTTP 和 WebSocket 服务器
 */

import 'dotenv/config'; // 加载 .env 文件中的环境变量
import { Server as IOServer } from 'socket.io';
import { buildApp } from './app.js';
import { registerRoomNamespace } from './comm/socket/room.js';

/**
 * 服务器主启动函数
 * 初始化并启动 HTTP 和 WebSocket 服务器
 */
async function main() {
  // 构建 Fastify 应用实例
  const app = buildApp();

  // 创建 Socket.IO 服务器实例
  // 将其附加到 Fastify 服务器上，实现 HTTP 和 WebSocket 的共存
  const io = new IOServer(app.server as any, {
    cors: { origin: true }, // 允许所有来源的跨域 WebSocket 连接
  });

  // 注册房间命名空间，处理实时通信逻辑
  registerRoomNamespace(io, app);

  // 从环境变量获取服务器配置
  const port = Number(process.env.PORT || 3000); // 服务器端口，默认 3000
  const host = process.env.HOST || '0.0.0.0';    // 服务器主机，默认监听所有接口

  try {
    // 启动服务器监听指定端口和主机
    await app.listen({ port, host });
    app.log.info({ port, host }, 'Server listening');
  } catch (err) {
    // 启动失败时记录错误并退出进程
    app.log.error(err);
    process.exit(1);
  }
}

// 启动服务器
main();
