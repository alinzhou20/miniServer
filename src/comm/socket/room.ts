/**
 * Socket.IO 房间管理模块
 * 
 * 实现迷你课堂的实时通信功能：
 * - JWT 认证中间件
 * - 自动房间分组（教师房间、学生房间、小组房间）
 * - 消息路由和转发
 * - 教师-学生双向通信
 */

import type { FastifyInstance } from 'fastify';
import type { Server as IOServer, Namespace, Socket } from 'socket.io';
import type { AnyJwtPayload } from '../../types/index.js';

/**
 * 消息载荷接口定义
 * @template T 消息数据类型
 */
interface MessagePayload<T = any> {
  from: { groupNo: number | string; studentNo: number | string }; // 发送者信息
  to: { groupNo?: number | string; studentNo?: number | string }; // 接收者信息（可选）
  data: T; // 消息内容
}

/**
 * 生成学生专用房间名称
 * @param {number | string} studentNo - 学号
 * @returns {string} 房间名称
 */
function roomForStudent(studentNo: number | string) {
  return `student:${studentNo}`;
}

/**
 * 生成小组专用房间名称
 * @param {number | string} groupNo - 小组号
 * @returns {string} 房间名称
 */
function roomForGroup(groupNo: number | string) {
  return `group:${groupNo}`;
}

/**
 * 注册房间命名空间和相关事件处理
 * @param {IOServer} io - Socket.IO 服务器实例
 * @param {FastifyInstance} app - Fastify 应用实例（用于 JWT 验证）
 */
export function registerRoomNamespace(io: IOServer, app: FastifyInstance) {
  // 创建 /room 命名空间，用于课堂实时通信
  const nsp: Namespace = io.of('/room');

  /**
   * Socket.IO JWT 认证中间件
   * 验证客户端连接时提供的 JWT 令牌
   */
  nsp.use(async (socket, next) => {
    try {
      // 从握手认证信息中获取 JWT 令牌
      const token = (socket.handshake.auth as any)?.token;
      if (!token) return next(new Error('no token'));
      
      // 使用 Fastify JWT 插件验证令牌
      const payload = app.jwt.verify(token) as AnyJwtPayload;
      (socket.data as any).user = payload; // 将用户信息存储到 socket 数据中
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  /**
   * 处理 WebSocket 连接事件
   */
  nsp.on('connection', (socket: Socket) => {
    const user = (socket.data as any).user as AnyJwtPayload | undefined;
    if (!user) return socket.disconnect(true);

    /**
     * 自动加入相应的房间
     * - 教师：加入 'teacher' 房间
     * - 学生：加入 'student' 房间、个人房间、小组房间
     */
    if (user.role === 'teacher') {
      socket.join('teacher'); // 教师房间，用于接收所有学生消息
    } else if (user.role === 'student') {
      socket.join('student'); // 学生总房间
      if ('studentNo' in user) socket.join(roomForStudent(user.studentNo)); // 个人房间
      if ('groupNo' in user && user.groupNo != null) socket.join(roomForGroup(user.groupNo)); // 小组房间
      socket.join(`student:${user.role}`); // 学生角色房间
    }

    /**
     * 消息转发处理
     * 支持教师-学生双向通信，包括：
     * - 教师向特定学生发送消息
     * - 教师向特定小组发送消息  
     * - 教师向所有学生广播消息
     * - 学生向教师发送消息
     */
    socket.on('message', async (payload: MessagePayload, ack?: (res: any) => void) => {
      try {
        const now = Date.now();

        // 提取目标接收者信息
        const toGroup = payload.to?.groupNo;
        const toStudent = payload.to?.studentNo;

        if ((user as any).role === 'teacher') {
          // 教师发送消息的路由逻辑
          if (toStudent && Number(toStudent) > 0) {
            // 发送给特定学生
            nsp.to(roomForStudent(toStudent)).emit('message', {
              code: 200,
              message: 'ok',
              from: payload.from,
              to: { studentNo: toStudent },
              data: payload.data,
              at: now,
            });
          } else if (toGroup && Number(toGroup) > 0) {
            // 发送给特定小组
            nsp.to(roomForGroup(toGroup)).emit('message', {
              code: 200,
              message: 'ok',
              from: payload.from,
              to: { groupNo: toGroup },
              data: payload.data,
              at: now,
            });
          } else {
            // 广播给所有学生
            nsp.to('student').emit('message', {
              code: 200,
              message: 'ok',
              from: payload.from,
              to: { groupNo: 0, studentNo: 0 }, // 0 表示广播
              data: payload.data,
              at: now,
            });
          }
          // 向发送者确认消息已投递
          ack && ack({ code: 200, message: 'delivered', at: now });
        } else {
          // 学生向教师发送消息
          nsp.to('teacher').emit('message', {
            code: 200,
            message: 'ok',
            from: payload.from,
            to: { groupNo: 0, studentNo: 0 }, // 发送给教师
            data: payload.data,
            at: now,
          });
          // 向发送者确认消息已投递
          ack && ack({ code: 200, message: 'delivered', at: now });
        }
      } catch (e: any) {
        // 消息转发失败，向发送者返回错误信息
        ack && ack({ code: 500, message: e?.message || 'relay-error', at: Date.now() });
      }
    });
  });
}
