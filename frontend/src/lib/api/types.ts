// ─── Auth ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: "student" | "officer" | "admin";
  college?: string;
  organization?: string;
  createdAt: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  expiresAt: number;
}

// ─── Student Profile ────────────────────────────────────────────────────────
export interface StudentProfile {
  userId: string;
  name: string;
  email: string;
  college: string;
  degree: string;
  graduationYear: number;
  skills: string[];
  linkedAccounts: LinkedAccount[];
  readinessScore: number;
  grade: string;
  gradeBand: "high" | "mid" | "low";
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  location?: string;
  resumeUrl?: string;
}

export interface LinkedAccount {
  platform: "leetcode" | "github" | "hackerrank" | "codechef" | "gfg" | "kaggle";
  username: string;
  connected: boolean;
  stats?: Record<string, number | string>;
}

// ─── Interview ──────────────────────────────────────────────────────────────
export type RoundType = "aptitude" | "coding" | "technical" | "hr";

export interface InterviewSession {
  id: string;
  userId: string;
  jobDescription: string;
  company?: string;
  role: string;
  status: "setup" | "in_progress" | "completed" | "abandoned";
  currentRound: RoundType;
  rounds: RoundResult[];
  startedAt?: string;
  completedAt?: string;
  overallScore?: number;
  overallGrade?: string;
}

export interface RoundResult {
  round: RoundType;
  score: number;
  maxScore: number;
  timeTaken: number;
  status: "pending" | "in_progress" | "completed";
  feedback?: string;
  answers?: Answer[];
}

export interface Answer {
  questionId: string;
  response: string;
  isCorrect?: boolean;
  score?: number;
  timeSpent: number;
}

// ─── Aptitude Round ─────────────────────────────────────────────────────────
export interface MCQQuestion {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
  timeLimit: number;
}

// ─── Coding Round ───────────────────────────────────────────────────────────
export interface CodingProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  starterCode: Record<string, string>;
  testCases: TestCase[];
  timeLimit: number;
  memoryLimit: number;
  tags: string[];
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface CodeRunResult {
  testCaseId: string;
  status: "passed" | "failed" | "error" | "tle";
  actualOutput?: string;
  expectedOutput?: string;
  executionTime?: number;
  memoryUsed?: number;
  error?: string;
}

// ─── Technical Round ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "ai" | "candidate";
  content: string;
  timestamp: string;
  audioUrl?: string;
}

// ─── Report ─────────────────────────────────────────────────────────────────
export interface InterviewReport {
  sessionId: string;
  userId: string;
  overallScore: number;
  overallGrade: string;
  gradeBand: "high" | "mid" | "low";
  percentile: number;
  completedAt: string;
  roundScores: {
    aptitude: number;
    coding: number;
    technical: number;
    hr: number;
  };
  radarData: RadarPoint[];
  aiNarrative: string;
  strengths: string[];
  improvements: string[];
  recommendations: LearningRecommendation[];
  proctoringFlags: number;
  benchmarkComparison: number;
}

export interface RadarPoint {
  subject: string;
  score: number;
  fullMark: number;
}

export interface LearningRecommendation {
  title: string;
  platform: string;
  url: string;
  priority: "high" | "medium" | "low";
  type: "course" | "practice" | "project";
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export interface DashboardData {
  profile: StudentProfile;
  readinessScore: number;
  readinessTrend: TrendPoint[];
  roundBreakdown: RadarPoint[];
  topicScores: TopicScore[];
  recentSessions: InterviewSession[];
  notifications: Notification[];
  percentile: number;
}

export interface TrendPoint {
  date: string;
  score: number;
}

export interface TopicScore {
  topic: string;
  score: number;
  maxScore: number;
  category: string;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
  read: boolean;
}

// ─── Progress Tracker ───────────────────────────────────────────────────────
export interface ProgressData {
  leetcode: {
    totalSolved: number;
    easy: number;
    medium: number;
    hard: number;
    streak: number;
    heatmap: HeatmapDay[];
  };
  github: {
    username: string;
    totalCommits: number;
    streak: number;
    weeklyData: number[];
    repos: number;
    contributions: HeatmapDay[];
  };
  platforms: PlatformStats[];
  weeklyReport: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface PlatformStats {
  platform: string;
  username: string;
  rating?: number;
  rank?: string;
  badge?: string;
  solved?: number;
  score?: number;
}

// ─── Resume ─────────────────────────────────────────────────────────────────
export interface ResumeData {
  fileName: string;
  uploadedAt: string;
  parsedSkills: string[];
  parsedExperience: string[];
  jdMatchScore?: number;
  suggestions?: ResumeSuggestion[];
  atsScore?: number;
  atsBreakdown?: ATSCategory[];
}

export interface ResumeSuggestion {
  original: string;
  suggested: string;
  reason: string;
  impact: "high" | "medium" | "low";
}

export interface ATSCategory {
  category: string;
  score: number;
  maxScore: number;
  suggestions: string[];
}

// ─── Officer Portal ─────────────────────────────────────────────────────────
export interface BatchStudent {
  id: string;
  name: string;
  email: string;
  college: string;
  degree: string;
  graduationYear: number;
  readinessScore: number;
  gradeBand: "high" | "mid" | "low";
  grade: string;
  sessionsCompleted: number;
  lastActive: string;
  roundScores: {
    aptitude: number;
    coding: number;
    technical: number;
    hr: number;
  };
}

export interface OfficerDashboard {
  totalStudents: number;
  avgReadiness: number;
  placedStudents: number;
  activeToday: number;
  distribution: { band: string; count: number }[];
  topPerformers: BatchStudent[];
  students: BatchStudent[];
}

// ─── WebSocket Events ────────────────────────────────────────────────────────
export type WSEventType =
  | "connection_established"
  | "round_start"
  | "round_complete"
  | "ai_message"
  | "code_result"
  | "proctoring_alert"
  | "session_timeout"
  | "score_update"
  | "notification";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}
