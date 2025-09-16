/**
 * 连接认证服务
 * 
 * 职责：
 * 1. 学生身份认证和验证
 * 2. 直接查询 studentDao，避免并发冲突
 * 3. 替代原有的 student 模块认证功能
 */

import { findByClass } from '../data/studentDao';
import { parseClassNumber } from '../utils';
import { Connect } from './connection';

/**
 * 认证请求接口
 */
export interface AuthRequest {
  classNo: string;
  studentNo: number;
  pin4?: string;
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  success: boolean;
  message?: string;
  studentId?: number;
  student?: {
    id: number;
    studentNo: number;
    realName: string;
  };
}

/**
 * 连接认证服务类
 */
export class Auth {
  /**
   * 学生认证
   * 
   * 直接查询学生数据库进行认证，避免并发冲突
   * 
   * @param request 认证请求参数
   * @returns 认证结果
   */
  static authenticate(request: AuthRequest): AuthResult {
    // 1. 验证请求参数
    if (!request.classNo || !request.studentNo) {
      return { success: false, message: '认证信息不完整' };
    }

    const { classNo, studentNo, pin4 } = request;

    try {
      // 2. 解析班级编号
      const { enrollYear, classSeq } = parseClassNumber(classNo);

      // 3. 查询班级学生列表
      const students = findByClass(enrollYear, classSeq);
      const student = students.find(s => s.student_no === studentNo);
      
      if (!student) {
        return { success: false, message: '学生信息不存在' };
      }

      // 4. 验证PIN码（如果设置了PIN）
      if (student.pin) {
        if (!pin4) {
          return { success: false, message: '请输入PIN码' };
        }
        if (student.pin !== pin4) {
          return { success: false, message: 'PIN码错误' };
        }
      }

      // 5. 根据id查找连接
      const connection = Connect.findByStudentId(student.id);
      if (connection) {
        return { success: false, message: '学生已连接' };
      }

      // 6. 返回成功结果
      return {
        success: true,
        message: '认证成功',
        studentId: student.id,
      };

    } catch (error) {
      console.error('[ConnectionAuth] 认证过程中发生错误:', error);
      return { success: false, message: '认证过程中发生错误' };
    }
  }
}
