/**
 * 班级编号工具函数
 * 
 * 提供班级编号与入学年份、班级序号之间的双向转换功能
 */

/**
 * 班级信息接口
 */
export interface ClassInfo {
  enrollYear: number;  // 入学年份
  classSeq: number;    // 班级序号
}

/**
 * 解析班级编号，将3位班级编号转换为入学年份和班级序号
 * @param classNo 班级编号，如 "601", "602"
 * @returns { enrollYear: number, classSeq: number } 入学年份和班级序号
 */
export function parseClassNumber(classNo: string): ClassInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() 返回 0-11，需要 +1
  
  const grade = parseInt(classNo.charAt(0)); // 年级：6表示六年级
  const classSeq = parseInt(classNo.substring(1)); // 班级序号：01表示1班
  
  // 根据月份判断学年度：8月及以后为新学年，之前为上一学年
  let schoolYear = currentYear;
  if (currentMonth < 8) {
    schoolYear = currentYear - 1; // 8月前属于上一学年
  }
  
  // 计算入学年份：学年度 - (年级 - 1)
  // 例如：2025年9月的6年级学生是2020年入学的
  // 例如：2025年6月的6年级学生是2019年入学的
  const enrollYear = schoolYear - (grade - 1);
  
  return { enrollYear, classSeq };
}

/**
 * 根据入学年份和班级序号生成班级编号
 * @param enrollYear 入学年份
 * @param classSeq 班级序号
 * @returns 班级编号字符串，如 "601", "602"
 */
export function generateClassNumber(enrollYear: number, classSeq: number): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 根据月份判断学年度
  let schoolYear = currentYear;
  if (currentMonth < 8) {
    schoolYear = currentYear - 1;
  }
  
  // 计算年级：学年度 - 入学年份 + 1
  const grade = schoolYear - enrollYear + 1;
  
  // 格式化班级序号为两位数
  const formattedClassSeq = classSeq.toString().padStart(2, '0');
  
  return `${grade}${formattedClassSeq}`;
}

/**
 * 验证班级编号格式是否正确
 * @param classNo 班级编号
 * @returns 是否为有效的班级编号格式
 */
export function isValidClassNumber(classNo: string): boolean {
  // 检查是否为3位数字
  if (!/^\d{3}$/.test(classNo)) {
    return false;
  }
  
  const grade = parseInt(classNo.charAt(0));
  const classSeq = parseInt(classNo.substring(1));
  
  // 年级应该在1-9之间
  if (grade < 1 || grade > 9) {
    return false;
  }
  
  // 班级序号应该大于0
  if (classSeq <= 0) {
    return false;
  }
  
  return true;
}
