export type UserRole = 'teacher' | 'student';

export interface JwtPayloadCommon {
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TeacherJwtPayload extends JwtPayloadCommon {
  role: 'teacher';
  username: string;
}

export interface StudentJwtPayload extends JwtPayloadCommon {
  role: 'student';
  studentId: number;
  studentNo: number;
  groupNo: number | null;
}

export type AnyJwtPayload = TeacherJwtPayload | StudentJwtPayload;
