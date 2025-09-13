# 数据库设计

## 1. 概述
使用 SQLite 作为主数据存储，面向“单教师、单机、校园 LAN、≤100 并发学生”的课堂互动与评价场景。推荐启用 WAL 模式以提升并发读写与耐久性。

核心概念：
- 学生（student）：教学对象；
- 课程（course）：具体课题；
- 活动（activity）：课堂活动；
- 标准（criterion）：活动评价标准；
- 评价（evaluation）：真实评价，学生 × 标准多表。

教师不落库，使用环境变量单独设置。

## 2. ER 关系（文字说明）
- `course` 1-n `activity`。
- `activity` 1-n `criterion`。
- `criterion` 1-n `evaluation`。
- `student` 1-n `evaluation`。

## 3. 表结构

### 3.1 student（学生）
| 字段 | 类型 | 约束/默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY | 主键 |
| enroll_year | INTEGER | NOT NULL | 入学年份 |
| real_name | TEXT | NOT NULL | 真实姓名 |
| class_no | INTEGER | NOT NULL | 班级号 |
| student_no | INTEGER | UNIQUE NOT NULL | 学号 |
| group_no | INTEGER |  | 小组号 |
| pin | TEXT | CHECK(length(pin)=4) | 4 位密码（可为空） |
| is_active | INTEGER | NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)) | 是否登录（0：未登录，1：已登录） |
| role | INTEGER | NOT NULL DEFAULT 0 CHECK(role IN (0,1,2)) | 角色（0：操作员，1：评价员，2：管理员） |
| info_awareness | REAL | NOT NULL DEFAULT 0.0 | 维度1：信息意识评分 |
| computational_thinking | REAL | NOT NULL DEFAULT 0.0 | 维度2：计算思维评分 |
| digital_learning_innovation | REAL | NOT NULL DEFAULT 0.0 | 维度3：数字化学习与创新评分 |
| social_responsibility | REAL | NOT NULL DEFAULT 0.0 | 维度4：信息社会责任评分 |
| created_at | INTEGER | NOT NULL | 创建时间 |
| updated_at | INTEGER | NOT NULL | 更新时间 |

唯一约束：`student_uq(enroll_year-class_no-student_no)`（入学年份-班级号-学号唯一）

### 3.2 course（课程）
| 字段 | 类型 | 约束/默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY | 主键，自增整数 |
| title | TEXT | NOT NULL | 课题 |
| grade | INTEGER | NOT NULL | 年级 |
| unit | INTEGER | NOT NULL | 单元 |
| seq | INTEGER | NOT NULL | 课程序号 |
| is_active | INTEGER | NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)) | 是否为在授课程（0：未在授，1：在授） |
| created_at | INTEGER | NOT NULL | 创建时间 |
| updated_at | INTEGER | NOT NULL | 更新时间 |

索引：`course_active_idx(is_active)`

### 3.3 activity（活动）
| 字段 | 类型 | 约束/默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY | 主键，自增整数 |
| course_id | INTEGER | NOT NULL REFERENCES course(id) ON DELETE CASCADE | 归属课程 |
| seq | INTEGER | NOT NULL | 活动序号 |
| type | INTEGER | NOT NULL CHECK(type BETWEEN 0 AND 9) | 活动类型（0-9） |
| title | TEXT | NOT NULL | 活动标题 |
| content_json | TEXT | NOT NULL | 内容 JSON |
| created_at | INTEGER | NOT NULL | 创建时间 |
| updated_at | INTEGER | NOT NULL | 更新时间 |

索引：`activity_course_idx(course_id)`

### 3.4 criterion（评价标准）
| 字段 | 类型 | 约束/默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY |  |
| activity_id | INTEGER | NOT NULL REFERENCES activity(id) ON DELETE CASCADE | 归属活动 |
| name | TEXT | NOT NULL | 标准名称（如“完成度/规范性/创新性”） |
| max_score | REAL | NOT NULL | 满分（如 100/10） |
| weight | REAL | NOT NULL DEFAULT 1.0 | 权重（汇总加权可用） |
| rubric_json | TEXT |  | 评分细则/量表（JSON，可选） |
| created_at | INTEGER | NOT NULL |  |
| updated_at | INTEGER | NOT NULL |  |

索引：`criterion_activity_idx(activity_id)`

### 3.5 evaluation（评价记录）
| 字段 | 类型 | 约束/默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PRIMARY KEY |  |
| criterion_id | INTEGER | NOT NULL REFERENCES criterion(id) ON DELETE CASCADE | 评价标准 |
| student_id | INTEGER | NOT NULL REFERENCES student(id) ON DELETE CASCADE | 被评价学生 |
| score | REAL | NOT NULL | 得分 |
| feedback | TEXT |  | 评语（可选） |
| created_at | INTEGER | NOT NULL |  |
| updated_at | INTEGER | NOT NULL |  |

约束：`UNIQUE(criterion_id, student_id)`（学生×标准唯一）

索引：`evaluation_student_idx(student_id)`
