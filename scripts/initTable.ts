/**
 * 数据库数据生成脚本
 * 
 * 功能：
 * 1. 生成3-6年级，1-10班，1-60号的学生记录
 * 2. 生成课程数据：五年级第一单元第13课流程图描述算法
 * 3. 生成活动数据：每个课程3个活动
 * 4. 生成评价标准数据：每个活动3个评价标准
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
 * 生成课程数据
 */
function generateCourseData() {
  console.log('生成课程数据...');
  
  try {
    // 插入五年级第一单元第13课流程图描述算法
    const courseStmt = db.prepare(`
      INSERT INTO course (title, grade, unit, seq, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    const result = courseStmt.run(
      '流程图描述算法',
      5,  // 五年级
      1,  // 第一单元
      3, // 第3课
      1,  // 设为活跃课程
      now,
      now
    );
    
    const courseId = result.lastInsertRowid;
    console.log(`✅ 课程创建成功，ID: ${courseId}`);
    return Number(courseId);
    
  } catch (error) {
    console.error('❌ 课程数据生成失败:', error);
    throw error;
  }
}

/**
 * 生成活动数据
 */
function generateActivityData(courseId: number) {
  console.log('生成活动数据...');
  
  const activities = [
    {
      seq: 1,
      type: 1,
      title: '流程图基础认知',
      content: {
        description: '学习流程图的基本符号和含义',
        objectives: ['理解流程图符号', '掌握基本绘制方法'],
        materials: ['流程图符号卡片', '绘图工具']
      }
    },
    {
      seq: 2,
      type: 2,
      title: '算法流程设计',
      content: {
        description: '设计简单算法的流程图',
        objectives: ['分析问题步骤', '绘制完整流程图'],
        materials: ['问题案例', '绘图软件']
      }
    },
    {
      seq: 3,
      type: 3,
      title: '流程图优化实践',
      content: {
        description: '优化和改进已有的流程图',
        objectives: ['发现流程问题', '提出优化方案'],
        materials: ['示例流程图', '评价表']
      }
    }
  ];
  
  const activityIds: number[] = [];
  
  try {
    const activityStmt = db.prepare(`
      INSERT INTO activity (course_id, seq, type, title, content_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    
    activities.forEach((activity, index) => {
      const result = activityStmt.run(
        courseId,
        activity.seq,
        activity.type,
        activity.title,
        JSON.stringify(activity.content),
        now,
        now
      );
      
      const activityId = Number(result.lastInsertRowid);
      activityIds.push(activityId);
      console.log(`  ✅ 活动${index + 1}创建成功: ${activity.title} (ID: ${activityId})`);
    });
    
    return activityIds;
    
  } catch (error) {
    console.error('❌ 活动数据生成失败:', error);
    throw error;
  }
}

/**
 * 生成评价标准数据
 */
function generateCriterionData(activityIds: number[]) {
  console.log('生成评价标准数据...');
  
  const criterionTemplates = [
    {
      name: '完成度',
      maxScore: 100,
      weight: 1.0,
      rubric: {
        excellent: { score: 90, description: '完全完成所有要求' },
        good: { score: 75, description: '基本完成主要要求' },
        fair: { score: 60, description: '部分完成要求' },
        poor: { score: 40, description: '未能有效完成' }
      }
    },
    {
      name: '规范性',
      maxScore: 100,
      weight: 0.8,
      rubric: {
        excellent: { score: 90, description: '严格遵循规范标准' },
        good: { score: 75, description: '基本符合规范要求' },
        fair: { score: 60, description: '部分符合规范' },
        poor: { score: 40, description: '不符合基本规范' }
      }
    },
    {
      name: '创新性',
      maxScore: 100,
      weight: 1.2,
      rubric: {
        excellent: { score: 90, description: '有明显创新亮点' },
        good: { score: 75, description: '有一定创新思路' },
        fair: { score: 60, description: '创新程度一般' },
        poor: { score: 40, description: '缺乏创新元素' }
      }
    }
  ];
  
  try {
    const criterionStmt = db.prepare(`
      INSERT INTO criterion (activity_id, name, max_score, weight, rubric_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    let totalCriteria = 0;
    
    activityIds.forEach((activityId, activityIndex) => {
      console.log(`  为活动${activityIndex + 1}生成评价标准...`);
      
      criterionTemplates.forEach((template, criterionIndex) => {
        const result = criterionStmt.run(
          activityId,
          template.name,
          template.maxScore,
          template.weight,
          JSON.stringify(template.rubric),
          now,
          now
        );
        
        totalCriteria++;
        console.log(`    ✅ 评价标准创建成功: ${template.name} (ID: ${result.lastInsertRowid})`);
      });
    });
    
    console.log(`✅ 共生成 ${totalCriteria} 个评价标准`);
    
  } catch (error) {
    console.error('❌ 评价标准数据生成失败:', error);
    throw error;
  }
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
            real_name: `${studentNo}号学生`,
            class_seq: classSeq,
            student_no: studentNo,
            pin: null // 设为空值
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
 * 清空现有数据
 */
function clearExistingData() {
  console.log('清空现有数据...');
  
  const tables = [
    { name: 'criterion', desc: '评价标准' },
    { name: 'activity', desc: '活动' },
    { name: 'course', desc: '课程' },
    { name: 'student', desc: '学生' }
  ];
  
  try {
    tables.forEach(table => {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
      if (result.count > 0) {
        console.log(`发现 ${result.count} 条${table.desc}数据，正在清空...`);
        db.exec(`DELETE FROM ${table.name}`);
        console.log(`✅ ${table.desc}数据已清空`);
      } else {
        console.log(`✅ ${table.desc}表为空，无需清空`);
      }
    });
    
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
    // 验证学生数据
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM student').get() as { count: number };
    console.log(`📊 数据统计:`);
    console.log(`   - 学生总数: ${studentCount.count}`);
    
    // 验证课程数据
    const courseCount = db.prepare('SELECT COUNT(*) as count FROM course').get() as { count: number };
    const courseInfo = db.prepare('SELECT title, grade, unit, seq FROM course LIMIT 1').get() as any;
    console.log(`   - 课程数量: ${courseCount.count}`);
    if (courseInfo) {
      console.log(`   - 课程信息: ${courseInfo.grade}年级第${courseInfo.unit}单元第${courseInfo.seq}课 - ${courseInfo.title}`);
    }
    
    // 验证活动数据
    const activityCount = db.prepare('SELECT COUNT(*) as count FROM activity').get() as { count: number };
    const activities = db.prepare('SELECT title FROM activity ORDER BY seq').all() as { title: string }[];
    console.log(`   - 活动数量: ${activityCount.count}`);
    activities.forEach((activity, index) => {
      console.log(`     ${index + 1}. ${activity.title}`);
    });
    
    // 验证评价标准数据
    const criterionCount = db.prepare('SELECT COUNT(*) as count FROM criterion').get() as { count: number };
    const criterionStats = db.prepare(`
      SELECT 
        a.title as activity_title,
        COUNT(c.id) as criterion_count
      FROM activity a
      LEFT JOIN criterion c ON a.id = c.activity_id
      GROUP BY a.id, a.title
      ORDER BY a.seq
    `).all() as { activity_title: string, criterion_count: number }[];
    
    console.log(`   - 评价标准总数: ${criterionCount.count}`);
    criterionStats.forEach(stat => {
      console.log(`     ${stat.activity_title}: ${stat.criterion_count}个标准`);
    });
    
    // 按年级统计学生
    const gradeStats = db.prepare(`
      SELECT 
        (? - enroll_year + 1) as grade,
        COUNT(*) as count 
      FROM student 
      GROUP BY enroll_year 
      ORDER BY enroll_year
    `).all(new Date().getFullYear()) as { grade: number, count: number }[];
    
    console.log(`\n📈 学生年级分布:`);
    gradeStats.forEach(stat => {
      console.log(`   - ${stat.grade}年级: ${stat.count}人`);
    });
    
  } catch (error) {
    console.error('❌ 数据验证失败:', error);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 数据库数据生成脚本启动');
  console.log('=' .repeat(60));
  
  try {
    // 1. 清空现有数据
    clearExistingData();
    
    // 2. 生成课程数据
    console.log('\n📚 第1步：生成课程数据');
    const courseId = generateCourseData();
    
    // 3. 生成活动数据
    console.log('\n🎯 第2步：生成活动数据');
    const activityIds = generateActivityData(courseId);
    
    // 4. 生成评价标准数据
    console.log('\n📋 第3步：生成评价标准数据');
    generateCriterionData(activityIds);
    
    // 5. 生成学生数据
    console.log('\n👥 第4步：生成学生数据');
    generateStudentData();
    
    // 6. 验证数据
    console.log('\n🔍 第5步：验证生成的数据');
    validateGeneratedData();
    
    console.log('\n🎉 数据库数据生成完成！');
    console.log('✅ 所有表数据已成功注入');
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
main();
