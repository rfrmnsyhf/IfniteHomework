export type UserRole = "admin" | "mahasiswa";

export type TaskPriority = "rendah" | "sedang" | "tinggi";

export type TaskType = "individu" | "kelompok";

export type PersonalTaskStatus =
  | "belum_dikerjakan"
  | "sedang_dikerjakan"
  | "menunggu_review"
  | "selesai";

export type SubmissionStatus = "submitted" | "revised" | "graded";

export interface Profile {
  id: string;
  email: string;
  name: string;
  nim: string | null;
  role: UserRole;
  avatar_url: string | null;
  password_changed: boolean;
}

export interface ProfileSensitive extends Profile {
  alamat: string | null;
  no_hp: string | null;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tgl_lahir: string | null;
}

export interface ClassInfo {
  id: string;
  name: string;
  code: string;
  semester: number;
  academic_year: string;
}

export interface Course {
  id: string;
  class_id: string;
  name: string;
  lecturer_name: string | null;
  color: string | null;
}

export interface Task {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: TaskPriority;
  type: TaskType;
  allow_submission: boolean;
  submission_deadline: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TaskWithMeta extends Task {
  course_name: string;
  course_color: string | null;
  my_status: PersonalTaskStatus;
  my_notes: string | null;
  checklist_total: number;
  checklist_done: number;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  sort_order: number;
}

export interface GroupMemberInfo {
  user_id: string;
  role_in_group: string | null;
  profile: Profile;
}

export interface Group {
  id: string;
  class_id: string;
  name: string;
  project_title: string | null;
  description: string | null;
  members: GroupMemberInfo[];
}

export interface Attachment {
  id: string;
  task_id: string;
  filename: string;
  storage_path: string;
  created_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  storage_path: string | null;
  status: SubmissionStatus;
  feedback: string | null;
  graded_at: string | null;
  submitted_at: string;
  updated_at?: string;
  student_name?: string | null;
}

export interface Announcement {
  id: string;
  class_id: string;
  title: string;
  content: string;
  created_by: string | null;
  author_name?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const STATUS_LABELS: Record<PersonalTaskStatus, string> = {
  belum_dikerjakan: "Belum Dikerjakan",
  sedang_dikerjakan: "Sedang Dikerjakan",
  menunggu_review: "Menunggu Review",
  selesai: "Selesai",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  rendah: "Rendah",
  sedang: "Sedang",
  tinggi: "Tinggi",
};

export const TYPE_LABELS: Record<TaskType, string> = {
  individu: "Individu",
  kelompok: "Kelompok",
};

export const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  revised: "Revisi",
  graded: "Dinilai",
};

export type FeedbackCategory = "bug" | "fitur" | "ui" | "performa" | "saran" | "lainnya";
export type FeedbackPriority = "rendah" | "normal" | "tinggi";
export type FeedbackStatus = "dikirim" | "dipertimbangkan" | "dikerjakan" | "selesai" | "ditolak";
export interface Feedback {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  is_anonymous: boolean;
  admin_response: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
}
