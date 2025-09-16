/**
 * Socket 事件处理器
 * 
 * 职责：
 * 1. 注册和处理所有 Socket 事件（message, disconnect, ping）
 * 2. 实现统一的消息路由逻辑
 * 3. 管理用户状态广播
 * 4. 处理系统消息广播
 */

import type { Namespace, Socket } from 'socket.io';
import { Connect } from '../service/connection';

export enum MessageType {
  SUBMIT = 'submit', // 学生提交消息（学生 -> 老师）
  DISTRIBUTE = 'distribute', // 教师分发消息（老师 -> 学生/小组/全体）
  DISCUSS = 'discuss', // 学生讨论消息（学生 -> 学生/小组）
  REQUEST = 'request', // 客户端请求后端服务（使用 ACK 返回）
}

export interface MessagePayload {
  type: string;
  from?: {
    groupNo?: string;
    studentNo?: string;
  };
  to?: {
    groupNo?: string[];
    studentNo?: string[];
  };
  data: any;
  at: number;
}

export class SocketEvents {
  private namespace: Namespace;

  constructor(namespace: Namespace) {
    this.namespace = namespace;
  }

  /**
   * 注册所有事件监听器
   * 为每个连接的 Socket 注册必要的事件处理器：
   * - submit: 学生提交消息（ACK）
   * - distribute: 教师分发消息（ACK）
   * - discuss: 学生讨论消息（ACK）
   * - request: 客户端请求服务（ACK 返回处理结果）
   */
  registerEvents(socket: Socket): void {
    // submit: 学生 -> 老师
    socket.on('submit', (payload: MessagePayload, ack?: (res: any) => void) => {
      this.handleSubmit(socket, payload, ack);
    });

    // distribute: 老师 -> 学生/小组/全体
    socket.on('distribute', (payload: MessagePayload, ack?: (res: any) => void) => {
      this.handleDistribute(socket, payload, ack);
    });

    // discuss: 学生 -> 学生/小组
    socket.on('discuss', (payload: MessagePayload, ack?: (res: any) => void) => {
      this.handleDiscuss(socket, payload, ack);
    });

    // request: 客户端 -> 后端服务（ACK返回）
    socket.on('request', (payload: MessagePayload, ack?: (res: any) => void) => {
      this.handleRequest(socket, payload, ack);
    });

  }

  // ===================== 校验与工具 =====================

  /**
   * 验证消息载荷格式
   */
  private validateMessagePayload(payload: MessagePayload): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    
    // 验证 type
    if (!payload.type || typeof payload.type !== 'string') {
      return false;
    }

    // 验证 data 字段存在
    if (payload.data === undefined) {
      return false;
    }
    
    return true;
  }

  // ===================== 事件处理：submit / distribute / discuss / request =====================

  /**
   * 学生 -> 老师：submit
   */
  private handleSubmit(socket: Socket, payload: MessagePayload, ack?: (res: any) => void): void {
    const at = Date.now();
    try {
      if (!this.validateMessagePayload(payload)) throw new Error('消息格式无效');
      const role = (socket as any).role;
      if (role !== 'student') throw new Error('无权限：仅学生可提交');

      const outgoing: MessagePayload = {...payload, at};
      this.namespace.to('teacher').emit(MessageType.SUBMIT, outgoing);

      ack?.({ code: 200, message: '提交成功', at });
    } catch (error: any) {
      ack?.({ code: 400, message: error?.message || '提交失败', at });
    }
  }

  /**
   * 老师 -> 学生/小组/全体：distribute
   */
  private handleDistribute(socket: Socket, payload: MessagePayload, ack?: (res: any) => void): void {
    const at = Date.now();
    try {
      if (!this.validateMessagePayload(payload)) throw new Error('消息格式无效');
      const role = (socket as any).role;
      if (role !== 'teacher') throw new Error('无权限：仅教师可分发');

      const outgoing: MessagePayload = { ...payload, at };

      this.namespace.to('student').emit(MessageType.DISTRIBUTE, outgoing);

      ack?.({ code: 200, message: '广播成功', at });
    } catch (error: any) {
      ack?.({ code: 400, message: error?.message || '广播失败', at });
    }
  }

  /**
   * 学生 -> 学生/小组：discuss
   */
  private handleDiscuss(socket: Socket, payload: MessagePayload, ack?: (res: any) => void): void {
    const at = Date.now();
    try {
      if (!this.validateMessagePayload(payload)) throw new Error('消息格式无效');
      const role = (socket as any).role;

      if (role !== 'student') throw new Error('无权限：仅学生可讨论');

      const outgoing: MessagePayload = { ...payload, at };

      this.namespace.to('student').emit(MessageType.DISCUSS, outgoing);

      ack?.({ code: 200, message: '讨论成功', at });
    } catch (error: any) {
      ack?.({ code: 400, message: error?.message || '讨论失败', at });
    }
  }

  /**
   * 客户端 -> 后端服务：request（ACK返回）
   * 约定 payload.data: { service: string; action?: string; params?: any }
   */
  private handleRequest(socket: Socket, payload: MessagePayload, ack?: (res: any) => void): void {
    const at = Date.now();
    try {
      if (!this.validateMessagePayload(payload)) throw new Error('消息格式无效');

      // 路由表，可按需扩展具体实现
      const handler = this.serviceHandlers[payload.type];
      if (!handler ) {
        ack?.({ code: 404, message: `未提供 ${payload.type} 服务`, at });
        return;
      }

      Promise.resolve(handler(socket))
        .then((result) => {
          ack?.({ code: 200, message: '请求成功', data: result, at });
        })
        .catch((err) => {
          console.error('[SocketEvents] request 服务处理失败:', err);
          ack?.({ code: 500, message: err?.message || '服务错误', at });
        });
    } catch (error: any) {
      console.error('[SocketEvents] request 处理失败:', error);
      ack?.({ code: 400, message: error?.message || '请求失败', at });
    }
  }

  // 可扩展的服务处理器表
  private serviceHandlers: Record<string, (socket: Socket) => any> = {
    get_stu_status: (socket: Socket) => {
      // 获取学生连接
      const students = Connect.findAll();
      console.log(`[SocketHandler] 获取学生连接: ${students}`);
      socket.emit('online', students);
      return {};
    },
  };
}
