/**
 * 学生数据生成脚本
 * 
 * 生成3-6年级，1-10班，1-60号的学生记录
 * 根据当前时间计算正确的入学年份
 */

import { db } from '../src/data/connect';
import { createStudent } from '../src/data/studentDao';
import { parseClassNumber } from '../src/utils/classNumber';

/**
 * 生成4位PIN码
 */
function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * 生成学生数据
 */
function generateStudentData() {
  console.log('开始生成学生数据...');
  
  let totalStudents = 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // 根据月份判断学年度
  let schoolYear = currentYear;
  if (currentMonth < 8) {
    schoolYear = currentYear - 1;
  }
  
  console.log(`当前学年度: ${schoolYear}`);
  
  // 生成3-6年级的学生
  for (let grade = 3; grade <= 6; grade++) {
    console.log(`生成${grade}年级学生...`);
    
    // 计算入学年份：学年度 - (年级 - 1)
    const enrollYear = schoolYear - (grade - 1);
    console.log(`${grade}年级入学年份: ${enrollYear}`);
    
    // 生成1-10班
    for (let classSeq = 1; classSeq <= 10; classSeq++) {
      console.log(`  生成${grade}年级${classSeq}班...`);
      
      // 生成1-60号学生
      for (let studentNo = 1; studentNo <= 60; studentNo++) {
        try {
          const studentData = {
            enroll_year: enrollYear,
            real_name: null,
            class_seq: classSeq,
            student_no: studentNo,
            group_no: null,
            pin: null, // 设为空值
            is_active: 0 as 0 | 1,
            role: null
            // 评分字段使用数据库默认值0.0，不传入
          };
          
          createStudent(studentData);
          totalStudents++;
          
          // 每100个学生输出一次进度
          if (totalStudents % 100 === 0) {
            console.log(`    已生成 ${totalStudents} 个学生...`);
          }
          
        } catch (error) {
          console.error(`生成学生失败 - ${grade}年级${classSeq}班${studentNo}号:`, error);
        }
      }
    }
  }
  
  console.log(`\n✅ 学生数据生成完成！`);
  console.log(`📊 统计信息:`);
  console.log(`   - 年级范围: 3-6年级`);
  console.log(`   - 班级范围: 每年级1-10班`);
  console.log(`   - 学号范围: 每班1-60号`);
  console.log(`   - 总学生数: ${totalStudents}`);
  console.log(`   - 学年度: ${schoolYear}`);
}

/**
 * 清空现有学生数据
 */
function clearExistingData() {
  console.log('清空现有学生数据...');
  try {
    const result = db.prepare('SELECT COUNT(*) as count FROM student').get() as { count: number };
    if (result.count > 0) {
      console.log(`发现 ${result.count} 条现有数据，正在清空...`);
      db.exec('DELETE FROM student');
      console.log('✅ 现有数据已清空');
    } else {
      console.log('✅ 数据库为空，无需清空');
    }
  } catch (error) {
    console.error('❌ 清空数据失败:', error);
    throw error;
  }
}

/**
 * 验证生成的数据
 */
function validateGeneratedData() {
  console.log('\n验证生成的数据...');
  
  try {
    // 统计总数
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM student').get() as { count: number };
    console.log(`总学生数: ${totalCount.count}`);
    
    // 按年级统计
    const gradeStats = db.prepare(`
      SELECT 
        (? - enroll_year + 1) as grade,
        COUNT(*) as count 
      FROM student 
      GROUP BY enroll_year 
      ORDER BY enroll_year
    `).all(new Date().getFullYear()) as { grade: number, count: number }[];
    
    console.log('各年级学生数:');
    gradeStats.forEach(stat => {
      console.log(`  ${stat.grade}年级: ${stat.count}人`);
    });
    
    // 验证班级编号解析
    console.log('\n验证班级编号解析:');
    const sampleStudents = db.prepare(`
      SELECT enroll_year, class_seq, student_no, real_name 
      FROM student 
      WHERE class_seq IN (1, 5, 10) 
      ORDER BY enroll_year, class_seq, student_no
      LIMIT 9
    `).all() as any[];
    
    sampleStudents.forEach(student => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      let schoolYear = currentYear;
      if (currentMonth < 8) {
        schoolYear = currentYear - 1;
      }
      
      const grade = schoolYear - student.enroll_year + 1;
      const classNo = `${grade}${student.class_seq.toString().padStart(2, '0')}`;
      
      console.log(`  学号${student.student_no} - ${grade}年级${student.class_seq}班 (班级编号: ${classNo})`);
    });
    
  } catch (error) {
    console.error('❌ 数据验证失败:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 学生数据生成脚本启动');
  console.log('=' .repeat(50));
  
  try {
    // 清空现有数据
    clearExistingData();
    
    // 生成新数据
    generateStudentData();
    
    // 验证数据
    validateGeneratedData();
    
    console.log('\n🎉 脚本执行完成！');
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
