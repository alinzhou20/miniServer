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

export enum MessageType {
  SUBMIT = 'submit', // 学生提交消息
  DISTRIBUTE = 'distribute', // 教师分发消息
}

export interface MessagePayload {
  type: MessageType;
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
    
    // 验证 type 字段
    if (!payload.type || !Object.values(MessageType).includes(payload.type)) {
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
   * 消息路由处理器类型定义
   */
  private routeHandlers = new Map<MessageType, (socket: Socket, payload: MessagePayload, timestamp: number) => {success: boolean, target: string}>([
    [MessageType.SUBMIT, this.handleSubmitMessage.bind(this)],
    [MessageType.DISTRIBUTE, this.handleDistributeMessage.bind(this)]
  ]);

  /**
   * 统一消息路由 - 基于消息类型分发到对应处理器
   */
  private routeMessage(socket: Socket, payload: MessagePayload, timestamp: number): {success: boolean, target: string} {
    const handler = this.routeHandlers.get(payload.type);
    
    if (!handler) {
      return {success: false, target: 'unsupported_type'};
    }

    return handler(socket, payload, timestamp);
  }


  /**
   * 处理 SUBMIT 类型消息 - 学生提交给教师
   */
  private handleSubmitMessage(socket: Socket, payload: MessagePayload, timestamp: number): {success: boolean, target: string} {
    const senderRole = (socket as any).role;
    const senderStudentNo = (socket as any).studentNo;
    const senderGroupNo = (socket as any).groupNo;

    // 验证发送者是学生
    if (senderRole !== 'student') {
      return {success: false, target: 'invalid_sender'};
    }

    const response = {
      type: payload.type,
      from: {
        role: senderRole,
        studentNo: senderStudentNo,
        groupNo: senderGroupNo
      },
      data: payload.data,
      at: timestamp
    };

    this.namespace.to('teacher').emit('message', response);
    return {success: true, target: 'teacher'};
  }

  
  /**
   * 处理 DISTRIBUTE 类型消息 - 教师分发给学生
   */
  private handleDistributeMessage(socket: Socket, payload: MessagePayload, timestamp: number): {success: boolean, target: string} {
    const senderRole = (socket as any).role;
    const senderStudentNo = (socket as any).studentNo;
    const senderGroupNo = (socket as any).groupNo;

    // 验证发送者是教师
    if (senderRole !== 'teacher') {
      return {success: false, target: 'invalid_sender'};
    }

    const response = {
      type: payload.type,
      from: {
        role: senderRole,
        studentNo: senderStudentNo,
        groupNo: senderGroupNo
      },
      data: payload.data,
      at: timestamp
    };

    this.namespace.to('student').emit('message', response);
    return {success: true, target: 'student'};
  }
}
