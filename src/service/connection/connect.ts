/**
 * 连接管理服务
 * 
 * 职责：
 * 1. 管理教师和学生连接
 * 2. 提供连接的创建、查询、删除接口
 * 3. 作为 Socket 层和数据层之间的桥梁
 */

import { createConnection, deleteBySocketId, findConnectionView, findByStudentId } from '../../data/connectionDao.js';
import type { Connection } from '../../data/connectionDao.js';

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
   * 获取所有连接
   */
  static findAll(): {studentNo: number, groupNo: number, at: number}[] {
    const at = Date.now();
    const connections = findConnectionView();
    const students = connections.map(connection => ({
      studentNo: connection.student_no,
      groupNo: connection.group_no,
      at
    }));
    return students;
  }

  /**
   * 根据学生ID查找连接
   */
  static findByStudentId(studentId: number): Connection | undefined {
    return findByStudentId(studentId);
  }

  /**
   * 删除连接
   */
  static removeConnection(socketId: string): boolean {
    return deleteBySocketId(socketId);
  }
}