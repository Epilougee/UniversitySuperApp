export type UserRole = 'Student' | 'Teacher' | 'Admin';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  year?: number;
  section?: string;
  cgpa?: number;
  attendance?: number;
  phone?: string;
  email?: string;
  batch?: string;
  address?: string;
  designation?: string;
  office?: string;
  expertise?: string;
}

export interface Student {
  id: string;
  name: string;
  department: string;
  year: number;
  section: string;
  cgpa: number;
  attendance: number;
  phone: string;
  email: string;
  batch: string;
  address: string;
}

export interface Teacher {
  id: string;
  name: string;
  department: string;
  designation: string;
  phone: string;
  email: string;
  office: string;
  expertise: string;
}

export interface Admin {
  id: string;
  name: string;
}

export interface CourseClass {
  id: number;
  name: string;
  subject_code: string;
  department: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_designation?: string;
  schedule: string;
  room: string;
  credits: number;
  group_name?: string;
  student_count?: number;
}

export interface MarkRecord {
  id: number;
  student_id: string;
  class_id: number;
  assessment_type: string;
  max_marks: number;
  obtained: number;
  semester: string;
  entered_by?: string;
  entered_at?: number;
  class_name?: string;
  subject_code?: string;
  credits?: number;
  student_name?: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: string;
  class_id: number;
  date: string;
  status: 'Present' | 'Absent';
  method: string;
  marked_at: number;
  class_name?: string;
  subject_code?: string;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  target: string;
  urgency: 'Low' | 'Medium' | 'High';
  author: string;
  author_role: string;
  created_at: number;
  reads: number;
}

export interface NotificationItem {
  id: number;
  user_id: string;
  user_role: string;
  title: string;
  body: string;
  category: string;
  read_status: number;
  created_at: number;
}

export interface ChatMessage {
  id: number;
  room_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  text: string;
  timestamp: number;
}

export interface ChatContact {
  id: string;
  name: string;
  role_label: string;
  role: UserRole;
}

export interface FeeRecord {
  id: number;
  student_id: string;
  semester: string;
  description: string;
  amount: number;
  paid: number;
  due_date: string;
  status: 'Paid' | 'Pending' | 'Partial' | 'Overdue';
}

export interface ExamRecord {
  id: number;
  subject: string;
  subject_code: string;
  date: string;
  time: string;
  venue: string;
  department: string;
  semester: string;
  exam_type: string;
}

export interface EventRecord {
  id: number;
  name: string;
  date: string;
  venue: string;
  category: string;
  reg_limit: number;
  registered: number;
  status: string;
  description: string;
}

export interface SystemStats {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  avgCgpa: number;
  avgAttendance: number;
  examCount: number;
  eventCount: number;
  pendingFees: number;
  announcementCount: number;
}
