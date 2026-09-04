/**
 * Server response shapes — these mirror the Express controllers in `backend/`.
 * Keep field names identical to the API; do not "tidy" them here.
 */

export type Role = "student" | "college-admin" | "super-admin";

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── User ──────────────────────────────────────────────────────────────────
export interface BackendUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  organization?: string;
  status?: "Pending" | "Approved" | "Rejected";
  isEmailVerified?: boolean;
  profilePicture?: string;
  collegeDomain?: string | null;
  codingProfiles?: Record<string, PlatformProfile>;
  trials?: Trials;
  createdAt?: string;
  updatedAt?: string;
}

export interface Trials {
  isActive: boolean;
  mockInterviews: { total: number; used: number };
  studentReports: { total: number; used: number };
  aiEvaluation: { total: number; used: number };
}

export interface PlatformProfile {
  username?: string;
  isVerified?: boolean;
  lastSyncedAt?: string | null;
  stats?: Record<string, number | string>;
  [k: string]: unknown;
}

// ─── Student profile ───────────────────────────────────────────────────────
export interface ScoreBreakdown {
  academicPerformance: number;
  codingPerformance: number;
  aptitudePerformance: number;
  communicationSkills: number;
  mockInterviewPerformance: number;
  professionalActivities: number;
  projectsPortfolio: number;
}

export interface StudentProfile {
  _id: string;
  user: BackendUser | string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
  attendance?: number;
  targetRole?: string;
  expectedCTC?: { min: number; max: number };
  resumeUrl?: string;
  skills?: string[];
  projects?: { title: string; description: string; githubLink?: string; liveLink?: string }[];
  externalMetrics?: Record<string, PlatformProfile>;
  placementReadinessScore: number;
  scoreBreakdown?: ScoreBreakdown;
  techScore?: number;
  aptitudeScore?: number;
  codingScore?: number;
  communicationScore?: number;
  atsScore?: number;
  atsLastCheckedAt?: string | null;
  skillGaps?: string[];
  mockHistoryCount?: number;
  lastMockAt?: string | null;
  streakDays?: number;
  profilePicture?: string;
  preferredInterviewLanguage?: string;
  codingLanguageChoices?: string[];
  linkedinProfile?: string;
  githubProfile?: string;
  kaggleProfile?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Interview session ─────────────────────────────────────────────────────
export type SessionStatus = "initialized" | "ongoing" | "completed" | "failed";

export interface InterviewSession {
  _id: string;
  student: string;
  campaign?: string | null;
  jobDescription: {
    title: string;
    description: string;
    requiredSkills?: string[];
    techStack?: string[];
  };
  targetRole: string;
  preferredCodingLanguage: string;
  status: SessionStatus;
  durationMinutes?: number;
  finalCompositeScore: number;
  finalGrade: "A" | "B" | "C" | "D" | "Pending";
  proctoringRiskScore: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PerformanceInsight {
  _id: string;
  student: string;
  session?: string;
  createdAt?: string;
  [k: string]: unknown;
}

// ─── Dashboard (GET /profile/dashboard) ────────────────────────────────────
export interface DashboardPayload {
  user: BackendUser;
  profile: StudentProfile | null;
  recentSessions: InterviewSession[];
  recentInsights: PerformanceInsight[];
  unreadNotifications: number;
  verifiedPlatforms: string[];
  codingProfiles: Record<string, PlatformProfile>;
  trials: Trials | null;
}

// ─── Progress (GET /profile/progress) ──────────────────────────────────────
export interface ProgressPayload {
  placementReadinessScore: number;
  sessionCount: number;
  completedCount: number;
  insightCount: number;
  unreadNotifications: number;
  verifiedPlatforms: number;
  profile: StudentProfile;
}

// ─── Analytics dashboard (GET /profile/analytics/dashboard) ────────────────
export interface AnalyticsDashboardPayload {
  summary: {
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    averageRiskScore: number;
    disqualifiedSessions: number;
    insightsCount: number;
  };
  performanceTrend: { date: string; score: number; roundType?: string }[];
  recentSessions: {
    id: string;
    targetRole: string;
    status: SessionStatus;
    finalCompositeScore: number;
    finalGrade: string;
    proctoringRiskScore: number;
    startedAt?: string;
    completedAt?: string;
  }[];
}

// ─── Notifications ─────────────────────────────────────────────────────────
export interface AppNotification {
  _id: string;
  recipient: string;
  recipientRole?: "student" | "college-admin" | "super-admin";
  title?: string;
  message: string;
  description?: string;
  type?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  status: "unread" | "read" | "archived" | "deleted";
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readAt?: string | null;
}

export interface Paginated<T> {
  data?: T[];
  notifications?: T[];
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  pagination?: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Subscription / billing ────────────────────────────────────────────────
export interface StudentPlan {
  _id?: string;
  key?: string;
  name: string;
  price: number;
  currency?: string;
  interval?: "monthly" | "quarterly" | "yearly" | string;
  features?: string[];
  limits?: Record<string, number>;
  [k: string]: unknown;
}

export interface SubscriptionSummary {
  _id: string;
  planType?: string;
  ownerType?: "individual" | "institution" | string;
  organization?: string | { organizationName?: string; name?: string };
  status: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
  autoRenew?: boolean;
  usage?: Record<string, { used: number; total: number }>;
  [k: string]: unknown;
}

// ─── Resume analysis (POST /resume/analyze) ───────────────────────────────
export interface ResumeAnalysis {
  atsScoreEstimate: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  summarySuggestion: string;
  experienceImprovements: string[];
  projectImprovements: string[];
  certificationImprovements: string[];
  generalTips: string[];
}

export interface ResumeHistoryItem {
  _id: string;
  title?: string;
  targetRole?: string;
  experienceLevel?: string;
  templateId?: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber?: string;
  subtotal?: number;
  totalAmount: number;
  currency?: string;
  paymentStatus: string;
  invoiceDate?: string;
  dueDate?: string;
  createdAt: string;
  [k: string]: unknown;
}
