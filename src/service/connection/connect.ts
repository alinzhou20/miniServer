/**
 * 连接管理服务
 * 
 * 职责：
 * 1. 管理教师和学生连接
 * 2. 提供连接的创建、查询、删除接口
 * 3. 作为 Socket 层和数据层之间的桥梁
 */

import { createConnection, deleteBySocketId, findBySocketId, findByGroupNo, findByStudentNo } from '../../data/connectionDao.js';
import type { CreateConnectionInput, Connection, ConnectionView } from '../../data/connectionDao.js';

/**
 * 连接信息接口
 */
export interface ConnectionInfo {
  role: 'teacher' | 'student';
  socketId: string;
  studentId?: number;
  groupNo?: number;
  studentNo?: number;
}

/**
 * 连接管理服务类
 */
export class Connect {
  /**
   * 创建学生连接
   */
  static createStudentConnection(info: {
    studentId: number;
    socketId: string;
    groupNo: number;
  }): Connection {
    return createConnection({
      student_id: info.studentId,
      socket_id: info.socketId,
      group_no: info.groupNo,
      role: 'student'
    });
  }

  /**
   * 查询连接信息
   */
  static findConnection(socketId: string): Connection | undefined {
    return findBySocketId(socketId);
  }

  /**
   * 删除连接
   */
  static removeConnection(socketId: string): boolean {
    return deleteBySocketId(socketId);
  }

  /**
   * 根据小组号查找连接
   */
  static findConnectionsByGroupNo(groupNo: number): Connection[] {
    return findByGroupNo(groupNo);
  }

  /**
   * 根据学号查找连接（包含详细信息）
   */
  static findConnectionsByStudentNo(studentNo: number): ConnectionView[] {
    return findByStudentNo(studentNo);
  }

  /**
   * 通过 socketId 获取连接信息
   */
  static getConnectionBySocketId(socketId: string): Connection | undefined {
    return findBySocketId(socketId);
  }

  /**
   * 判断是否为学生连接
   */
  static isStudentConnection(socketId: string): boolean {
    const connection = findBySocketId(socketId);
    return connection?.role === 'student';
  }
}