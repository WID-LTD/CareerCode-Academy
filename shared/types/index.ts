export type UserRole = 'student' | 'instructor' | 'admin' | 'super_admin';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICourse {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  price: number;
  category: string;
  instructorId: string;
  instructor?: IUser;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  published: boolean;
  rating?: number;
  enrollments?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ILesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoUrl?: string;
  duration: number;
  order: number;
  resources?: string[];
  isFree: boolean;
  createdAt: string;
}

export interface IAssignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  createdAt: string;
}

export interface ISubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  student?: IUser;
  fileUrl?: string;
  score?: number;
  feedback?: string;
  submittedAt: string;
}

export interface IPayment {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  provider: 'paystack' | 'flutterwave' | 'manual';
  reference: string;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface IEnrollment {
  id: string;
  userId: string;
  courseId: string;
  course?: ICourse;
  progress: number;
  completed: boolean;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  completedLessons?: string[];
  enrolledAt: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICertificate {
  id: string;
  userId: string;
  user?: IUser;
  courseId: string;
  course?: ICourse;
  certificateUrl?: string;
  verificationCode: string;
  issuedAt: string;
}

export interface IReview {
  id: string;
  courseId: string;
  userId: string;
  user?: IUser;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface IBlog {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  author?: IUser;
  category: string;
  tags: string[];
  imageUrl?: string;
  slug: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface IForumThread {
  id: string;
  courseId: string;
  userId: string;
  user?: IUser;
  title: string;
  content: string;
  createdAt: string;
}

export interface IForumMessage {
  id: string;
  threadId: string;
  userId: string;
  user?: IUser;
  content: string;
  createdAt: string;
}

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface IDashboardStats {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  totalEnrollments: number;
  recentEnrollments: IEnrollment[];
  revenueByMonth: { month: string; amount: number }[];
  courseDistribution: { category: string; count: number }[];
}

export interface IPaymentInitRequest {
  courseId: string;
  provider: 'flutterwave' | 'paystack';
  redirectUrl: string;
}

export interface IPaymentInitResponse {
  authorizationUrl: string;
  reference: string;
}

export interface IQuiz {
  id: string;
  lessonId: string;
  questions: IQuizQuestion[];
}

export interface IQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface IWishlistItem {
  id: string;
  userId: string;
  courseId: string;
  course?: ICourse;
  createdAt: string;
}

export interface ILessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface INavLink {
  label: string;
  href: string;
  icon?: string;
}

export interface IBreadcrumb {
  label: string;
  href?: string;
}
