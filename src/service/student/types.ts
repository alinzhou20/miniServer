/**
 * 学生服务模块类型定义
 */

/**
 * 学生身份信息请求参数
 */
export interface authRequest {
  classNo: string;  // 班级编号，如 "601"、"602"
  studentNo: number;
  groupNo?: number;
  pin4?: string;
}

/**
 * 输入参数验证以及转换
 */
export function validateAuthRequest(request: authRequest): { valid: boolean; message?: string } {
  const { classNo, studentNo, groupNo, pin4 } = request;

  // 验证班级编号
  if (!classNo || typeof classNo !== 'string' || !/^\d{3}$/.test(classNo)) {
    return { valid: false, message: '班级编号格式不正确，应为3位数字如601、602' };
  }
  
  // 验证学号
  if (!studentNo || typeof studentNo !== 'number' || studentNo <= 0) {
    return { valid: false, message: '学号格式不正确' };
  }
  
  // 验证小组号（可选）
  if (groupNo !== undefined && groupNo !== null && (typeof groupNo !== 'number' || groupNo <= 0)) {
    return { valid: false, message: '小组号格式不正确' };
  }
  
  // 验证PIN码（可选）
  if (pin4 && (typeof pin4 !== 'string' || pin4.length !== 4)) {
    return { valid: false, message: 'PIN码必须为4位' };
  }
  
  return { valid: true };
}

/**
 * 认证结果
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  message?: string;
  student?: {
    id: number;
    studentNo: number;
    groupNo: number | null;
    realName: string;
    role: 0 | 1 | 2;
  };
}
