/**
 * 学生认证服务
 * 
 * 处理学生身份验证相关的业务逻辑
 */

import { updateActiveStatus, findByClass } from '../../data';
import type { authRequest, AuthResult } from './types';
import { validateAuthRequest } from './types';
import { parseClassNumber } from '../../utils';


/**
 * 认证服务类
 */
export class AuthService {
  /**
   * 学生登录功能
   * @param request 认证请求参数
   * @param jwtSign JWT签名函数
   * @returns 认证结果
   */
  static login(request: authRequest, jwtSign?: (payload: any, options?: any) => string): AuthResult {
    // 1. 验证请求参数
    const validation = validateAuthRequest(request);
    if (!validation.valid) {
      return { success: false, message: validation.message! };
    }

    const { classNo, studentNo, groupNo, pin4 } = request;

    try {
      // 2. 解析班级编号
      const { enrollYear, classSeq } = parseClassNumber(classNo);

      // 3. 获取班级学生列表并查找目标学生
      const students = findByClass(enrollYear, classSeq);
      const student = students.find(s => s.student_no === studentNo);
      if (!student) {
        return { success: false, message: '学生信息不存在' };
      }

      // 4. 验证PIN码
      if (student.pin) {
        if (!pin4) {
          return { success: false, message: '请输入PIN码' };
        }
        if (student.pin !== pin4) {
          return { success: false, message: 'PIN码错误' };
        }
      }

      // 5. 检查活跃状态
      if (student.is_active === 1) {
        return { success: false, message: '该账号已在其他设备登录，存在冲突' };
      }

      // 6. 设置为活跃状态
      if (!updateActiveStatus(student.id, 1)) {
        return { success: false, message: '登录失败，请重试' };
      }

      // 7. 生成JWT token并返回成功结果
      let token: string;
      if (jwtSign) {
        // 使用JWT生成包含学生信息的token
        token = jwtSign(
          { 
            role: 'student', 
            studentId: student.id,
            studentNo: student.student_no,
            groupNo: student.group_no,
            realName: student.real_name,
            classNo: classNo
          },
          { expiresIn: '8h' }
        );
      } else {
        // 降级处理：如果没有JWT签名函数，返回错误
        return { success: false, message: 'JWT签名服务不可用' };
      }

      return {
        success: true,
        token,
        message: '登录成功',
        student: {
          id: student.id,
          studentNo: student.student_no,
          groupNo: student.group_no,
          realName: student.real_name || '',
          role: student.role || 0
        }
      };

    } catch (error) {
      return { success: false, message: '登录过程中发生错误' };
    }
  }
}
