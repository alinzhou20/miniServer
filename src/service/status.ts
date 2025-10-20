/**
 * 状态服务
 * 处理学生状态更新
 */

import { updateUser } from '../data/userDao.js';
import type { ReqEvent } from '../type/index.js';

/**
 * 学生状态更新：更新数据库中的用户状态
 */
export async function updateStudentStatus(payload: ReqEvent): Promise<{ success: boolean; message: string; status?: any }> {
  try {
    const { studentNo, status } = payload.data;
    
    // 更新数据库中的用户状态
    const user = await updateUser(studentNo, { status });
    
    return {
      success: true,
      message: '状态更新成功',
      status: {
        studentNo: user.student_no,
        groupNo: user.group_no,
        status: user.status,
        timestamp: Date.now()
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: `状态更新失败: ${error.message}`
    };
  }
}
