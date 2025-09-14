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
import { Connect } from '../service';

export interface MessagePayload {
  broadcast: boolean;
  teacher: boolean;
  from: {
    groupNo: string;
    studentNo: string;
  };
  to: {
    groupNo: string[];
    studentNo: string[];
  };
  data: any;
}

export class SocketEvents {
  private namespace: Namespace;

  constructor(namespace: Namespace) {
    this.namespace = namespace;
  }

  /**
   * 注册所有事件监听器
   * 为每个连接的 Socket 注册必要的事件处理器：
   * - message: 处理用户消息和路由
   */
  registerEvents(socket: Socket): void {
    // 消息事件 - 支持 ACK 确认机制
    socket.on('message', (payload: MessagePayload, ack?: (res: any) => void) => {
      this.handleMessage(socket, payload, ack);
    });

  }

  /**
   * 处理消息 - 统一路由逻辑
   * 
   * 消息处理流程：
   * 1. 验证消息格式
   * 2. 解析发送者信息
   * 3. 构建标准响应格式
   * 4. 根据目标进行精确路由
   * 5. 发送 ACK 确认
   */
  private handleMessage(socket: Socket, payload: MessagePayload, ack?: (res: any) => void): void {
    try {

      // 1. 验证消息格式
      if (!this.validateMessagePayload(payload)) {
        throw new Error('消息格式无效');
      }

      const timestamp = Date.now();

      // 2. 执行精确消息路由
      const routeResult = this.routeMessage(socket, payload, timestamp);
      
      // 3. 发送 ACK 确认
      if (ack) {
        ack({ 
          code: 200, 
          message: 'delivered', 
          routed: routeResult,
          at: timestamp 
        });
      }

    } catch (error: any) {
      console.error('[SocketEvents] 消息处理失败:', error);
      if (ack) {
        ack({ code: 500, message: error?.message || 'Message failed', at: Date.now() });
      }
    }
  }

  /**
   * 验证消息载荷格式
   */
  private validateMessagePayload(payload: MessagePayload): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    
    // 验证 from 字段
    if (!payload.from || typeof payload.from !== 'object') {
      return false;
    }
    
    // 验证 to 字段
    if (!payload.to || typeof payload.to !== 'object') {
      return false;
    }
    
    // 验证 data 字段存在
    if (payload.data === undefined) {
      return false;
    }
    
    return true;
  }

  /**
   * 统一消息路由 - 解析目标并路由到对应 Socket 连接
   */
  private routeMessage(socket: Socket, payload: MessagePayload, timestamp: number): string {

    const senderRole = (socket as any).role;
    const senderStudentNo = (socket as any).studentNo;
    const senderGroupNo = (socket as any).groupNo;
    const receiverRole = payload.teacher ? 'teacher' : 'student';
    const receiverStudentNo = payload.to.studentNo;
    const receiverGroupNo = payload.to.groupNo;

    const response = {
      from: {
        role: senderRole,
        studentNo: senderStudentNo,
        groupNo: senderGroupNo
      },
      data: payload.data,
      at: timestamp
    };

    //=====学生消息路由=====
    if (senderRole === 'student') {
      // 1. 发送给教师
      if (receiverRole === 'teacher') {
        this.namespace.to('teacher').emit('message', response);
        return 'teacher';
      }
    }

    //=====教师消息路由=====
    if (senderRole === 'teacher') {
      // 1. 广播给学生
      if (receiverRole === 'student') {
        this.namespace.to('student').emit('message', response);
        return 'student';
      }
    }

    return 'invalid_target';
  }
}
