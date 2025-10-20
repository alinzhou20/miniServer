/**
 * 认证服务
 * 处理用户登录逻辑
 */

import { createTable, dropTable, checkTableExists } from '../data/connect.js';
import { findUserByStudentNo, createUser } from '../data/userDao.js';
import type { ReqEvent } from '../type/index.js';

/**
 * 学生登录：查找或创建学生用户
 */
export async function studentLogin(payload: ReqEvent): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const { studentNo, groupNo } = payload.data;
    
    // 查找用户，不存在则创建
    let user = await findUserByStudentNo(studentNo);
    if (!user) {
      user = await createUser({
        student_no: studentNo,
        group_no: groupNo,
        role: 'student',
        status: {online: true},
        last_login_at: Date.now()
      });
    }
    
    return {
      success: true,
      message: '登录成功',
      user: {
        studentNo: user.student_no,
        role: user.role,
        groupNo: user.group_no
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `登录失败: ${error.message}`
    };
  }
}

/**
 * 教师登录：删除旧表并创建新表
 */
export async function teacherLogin(payload: ReqEvent): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const { loginType, loginIndex } = payload.data;
    // 预登录检查表是否存在
    if (loginIndex === 0) {
      const tableExists = await checkTableExists();
      if (tableExists) {
        return {
          success: false,
          message: '数据表已存在'
        };
      }
    }

    // 登录并重置数据表
    if (loginIndex === 1 && loginType === 'reset') {
      await dropTable();
      await createTable();
    }
    
    return {
      success: true,
      message: '教师登录成功',
      user: {
        studentNo: 0,
        role: 'teacher',
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `登录失败: ${error.message}`
    };
  }
}

/**
 * 学生登出：返回学生信息
 */
export async function studentLogout(payload: ReqEvent): Promise<{ success: boolean; message: string; user?: any }> {
  try {
    const { studentNo, groupNo } = payload.data;
    
    return {
      success: true,
      message: '登出成功',
      user: {
        studentNo,
        role: 'student',
        groupNo
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `登出失败: ${error.message}`
    };
  }
}

/**
 * 教师登出：删除数据表
 */
export async function teacherLogout(payload: ReqEvent): Promise<{ success: boolean; message: string }> {
  try {
    const { logoutType } = payload.data;
    // 删除所有数据表
    if (logoutType === 'clear') {
      await dropTable();
    }
    
    return {
      success: true,
      message: '教师登出成功'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `登出失败: ${error.message}`
    };
  }
}
