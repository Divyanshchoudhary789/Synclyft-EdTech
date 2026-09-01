// Mock data layer — realistic data for all screens before backend wiring

import type {
  StudentProfile,
  DashboardData,
  ProgressData,
  InterviewReport,
  MCQQuestion,
  CodingProblem,
  ChatMessage,
  OfficerDashboard,
  BatchStudent,
  ResumeData,
} from "@synclyft/lib/types";

// ─── Student Profile ────────────────────────────────────────────────────────
export const mockProfile: StudentProfile = {
  userId: "u_01JK5M9X",
  name: "Arjun Mehta",
  email: "arjun.mehta@iitb.ac.in",
  college: "IIT Bombay",
  degree: "B.Tech Computer Science",
  graduationYear: 2025,
  skills: ["Python", "React", "TypeScript", "Node.js", "ML", "Docker", "PostgreSQL", "Redis"],
  linkedAccounts: [
    { platform: "leetcode", username: "arjun_m", connected: true, stats: { solved: 342, streak: 14 } },
    { platform: "github", username: "arjunmehta", connected: true, stats: { repos: 28, commits: 1247 } },
    { platform: "hackerrank", username: "arjun_m", connected: true, stats: { stars: 5, solved: 89 } },
    { platform: "codechef", username: "arjun_m", connected: true, stats: { rating: 1847, rank: "4 Star" } },
    { platform: "gfg", username: "arjunmehta", connected: false },
    { platform: "kaggle", username: "arjunm", connected: true, stats: { notebooks: 12, medals: 3 } },
  ],
  readinessScore: 82,
  grade: "A",
  gradeBand: "high",
  bio: "Final year CS student with a focus on distributed systems and ML engineering.",
  phone: "+91 98765 43210",
  location: "Mumbai, India",
};

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const mockDashboard: DashboardData = {
  profile: mockProfile,
  readinessScore: 82,
  percentile: 91,
  readinessTrend: [
    { date: "2025-01-01", score: 58 },
    { date: "2025-01-08", score: 63 },
    { date: "2025-01-15", score: 67 },
    { date: "2025-01-22", score: 71 },
    { date: "2025-02-01", score: 74 },
    { date: "2025-02-08", score: 78 },
    { date: "2025-02-15", score: 79 },
    { date: "2025-02-22", score: 82 },
  ],
  roundBreakdown: [
    { subject: "Aptitude", score: 78, fullMark: 100 },
    { subject: "Coding", score: 85, fullMark: 100 },
    { subject: "Technical", score: 80, fullMark: 100 },
    { subject: "HR", score: 88, fullMark: 100 },
    { subject: "Problem Solving", score: 83, fullMark: 100 },
    { subject: "Communication", score: 86, fullMark: 100 },
  ],
  topicScores: [
    { topic: "Data Structures", score: 88, maxScore: 100, category: "coding" },
    { topic: "Algorithms", score: 82, maxScore: 100, category: "coding" },
    { topic: "System Design", score: 75, maxScore: 100, category: "technical" },
    { topic: "Quantitative", score: 79, maxScore: 100, category: "aptitude" },
    { topic: "Logical Reasoning", score: 83, maxScore: 100, category: "aptitude" },
    { topic: "Verbal", score: 91, maxScore: 100, category: "aptitude" },
    { topic: "Behavioral", score: 88, maxScore: 100, category: "hr" },
    { topic: "Leadership", score: 82, maxScore: 100, category: "hr" },
  ],
  recentSessions: [
    {
      id: "s_XK91P",
      userId: "u_01JK5M9X",
      jobDescription: "SDE-2 at Flipkart",
      company: "Flipkart",
      role: "SDE-2",
      status: "completed",
      currentRound: "hr",
      rounds: [],
      startedAt: "2025-02-20T10:00:00Z",
      completedAt: "2025-02-20T12:30:00Z",
      overallScore: 82,
      overallGrade: "A",
    },
    {
      id: "s_YM82Q",
      userId: "u_01JK5M9X",
      jobDescription: "ML Engineer at Google",
      company: "Google",
      role: "ML Engineer",
      status: "completed",
      currentRound: "hr",
      rounds: [],
      startedAt: "2025-02-15T14:00:00Z",
      completedAt: "2025-02-15T16:45:00Z",
      overallScore: 78,
      overallGrade: "B+",
    },
  ],
  notifications: [
    { id: "n1", type: "success", message: "New company: Zepto is now on SyncLyft. Practice now.", timestamp: "2025-02-22T09:00:00Z", read: false },
    { id: "n2", type: "info", message: "Your Coding round score improved by +7 points.", timestamp: "2025-02-21T16:30:00Z", read: false },
    { id: "n3", type: "warning", message: "System Design is your weakest area. 3 recommendations added.", timestamp: "2025-02-20T12:00:00Z", read: true },
  ],
};

// ─── Progress Data ───────────────────────────────────────────────────────────
const generateHeatmap = () => {
  const days = [];
  const baseDate = new Date("2026-07-06T12:00:00Z");
  for (let i = 364; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const count = (i * 3 + 5) % 10 < 4 ? ((i * 7) % 8) : 0;
    days.push({
      date: d.toISOString().split("T")[0],
      count,
      level: (count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : count <= 6 ? 3 : 4) as 0 | 1 | 2 | 3 | 4,
    });
  }
  return days;
};

export const mockProgress: ProgressData = {
  leetcode: {
    totalSolved: 342,
    easy: 124,
    medium: 178,
    hard: 40,
    streak: 14,
    heatmap: generateHeatmap(),
  },
  github: {
    username: "arjunmehta",
    totalCommits: 1247,
    streak: 21,
    weeklyData: [12, 8, 15, 23, 9, 18, 11],
    repos: 28,
    contributions: generateHeatmap(),
  },
  platforms: [
    { platform: "HackerRank", username: "arjun_m", badge: "Gold", solved: 89, score: 2340 },
    { platform: "CodeChef", username: "arjun_m", rating: 1847, rank: "4 Star", solved: 156 },
    { platform: "GFG", username: "arjunmehta", rating: 1623, rank: "Institute Rank 12", solved: 203 },
    { platform: "Kaggle", username: "arjunm", badge: "Notebooks Expert", score: 3 },
  ],
  weeklyReport:
    "Exceptional week — you solved 23 problems on LeetCode (top 5% weekly activity), pushed 47 commits across 3 repos, and your CodeChef rating broke the 1800 barrier for the first time. Weak spot: dynamic programming problems (3/7 solved). Recommend 2 dedicated DP sessions before your next mock interview.",
};

// ─── MCQ Questions ───────────────────────────────────────────────────────────
export const mockMCQs: MCQQuestion[] = [
  {
    id: "q1",
    text: "A train travels from station A to station B at 60 km/h and returns at 40 km/h. What is the average speed for the entire journey?",
    options: [
      { id: "a", text: "48 km/h" },
      { id: "b", text: "50 km/h" },
      { id: "c", text: "52 km/h" },
      { id: "d", text: "45 km/h" },
    ],
    difficulty: "medium",
    category: "Quantitative Aptitude",
    timeLimit: 90,
  },
  {
    id: "q2",
    text: "If FRIEND is coded as HUMJTK, how is CANDLE coded in that language?",
    options: [
      { id: "a", text: "EDRIRL" },
      { id: "b", text: "DCQHQK" },
      { id: "c", text: "EDRJMN" },
      { id: "d", text: "FCPQMF" },
    ],
    difficulty: "medium",
    category: "Logical Reasoning",
    timeLimit: 75,
  },
  {
    id: "q3",
    text: "What is the time complexity of building a heap from an unsorted array of n elements?",
    options: [
      { id: "a", text: "O(n log n)" },
      { id: "b", text: "O(n²)" },
      { id: "c", text: "O(n)" },
      { id: "d", text: "O(log n)" },
    ],
    difficulty: "medium",
    category: "Computer Science",
    timeLimit: 60,
  },
  {
    id: "q4",
    text: "In a group of 6 people, how many ways can a committee of 3 be formed if two specific people refuse to serve together?",
    options: [
      { id: "a", text: "14" },
      { id: "b", text: "16" },
      { id: "c", text: "12" },
      { id: "d", text: "18" },
    ],
    difficulty: "hard",
    category: "Quantitative Aptitude",
    timeLimit: 120,
  },
  {
    id: "q5",
    text: "Which of the following is NOT a property of a B+ Tree?",
    options: [
      { id: "a", text: "All data is stored in leaf nodes" },
      { id: "b", text: "Leaf nodes are linked for sequential access" },
      { id: "c", text: "Internal nodes store data records" },
      { id: "d", text: "Tree is always balanced" },
    ],
    difficulty: "hard",
    category: "Computer Science",
    timeLimit: 90,
  },
];

// ─── Coding Problem ──────────────────────────────────────────────────────────
export const mockCodingProblem: CodingProblem = {
  id: "cp_001",
  title: "Maximum Subarray with Circular Wrap",
  difficulty: "medium",
  description: `Given a **circular integer array** \`nums\` of length \`n\`, return the maximum possible sum of a non-empty subarray.

A circular array means the end of the array connects to the beginning. Formally, the next element of \`nums[i]\` is \`nums[(i + 1) % n]\` and the previous element of \`nums[i]\` is \`nums[(i - 1 + n) % n]\`.

A subarray may only include each element of the fixed buffer \`nums\` at most once. For a fixed buffer \`nums\`, there are two candidates for the maximum sum:

1. The subarray is not circular — use **Kadane's algorithm** on the original array.
2. The subarray is circular — the answer equals **total_sum - min_subarray_sum**.

Return the maximum of the two candidates.`,
  examples: [
    { input: "nums = [1,-2,3,-2]", output: "3", explanation: "Subarray [3] has maximum sum 3." },
    { input: "nums = [5,-3,5]", output: "10", explanation: "Subarray [5,5] has maximum sum 5 + 5 = 10." },
    { input: "nums = [-3,-2,-3]", output: "-2", explanation: "Subarray [-2] has maximum sum -2." },
  ],
  constraints: [
    "n == nums.length",
    "1 ≤ n ≤ 3 × 10⁴",
    "-3 × 10⁴ ≤ nums[i] ≤ 3 × 10⁴",
  ],
  starterCode: {
    python: `def maxSubarraySumCircular(nums: list[int]) -> int:
    # Your solution here
    pass`,
    javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
var maxSubarraySumCircular = function(nums) {
    // Your solution here
};`,
    java: `class Solution {
    public int maxSubarraySumCircular(int[] nums) {
        // Your solution here
        return 0;
    }
}`,
    cpp: `class Solution {
public:
    int maxSubarraySumCircular(vector<int>& nums) {
        // Your solution here
        return 0;
    }
};`,
  },
  testCases: [
    { id: "t1", input: "[1,-2,3,-2]", expectedOutput: "3", isHidden: false },
    { id: "t2", input: "[5,-3,5]", expectedOutput: "10", isHidden: false },
    { id: "t3", input: "[-3,-2,-3]", expectedOutput: "-2", isHidden: false },
    { id: "t4", input: "[3,1,2,-1]", expectedOutput: "6", isHidden: true },
    { id: "t5", input: "[1,2,3,4,5,-1,-2,-3,-4,-5]", expectedOutput: "15", isHidden: true },
  ],
  timeLimit: 2000,
  memoryLimit: 256,
  tags: ["Array", "Dynamic Programming", "Kadane's Algorithm"],
};

// ─── Technical Round Messages ────────────────────────────────────────────────
export const mockTechnicalMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "ai",
    content: "Welcome, Arjun. I'm your technical interviewer today. We'll be going through system design and core CS fundamentals over the next 30 minutes. Let's start with something practical — can you walk me through how you would design a URL shortener service like bit.ly that needs to handle 10 billion URLs and serve 100,000 requests per second?",
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: "m2",
    role: "candidate",
    content: "Sure. At that scale, I'd start with the core encoding scheme — a base-62 encoding using [a-zA-Z0-9] giving us 62^7 ≈ 3.5 trillion unique URLs, which covers 10 billion comfortably. For the architecture: the write path goes through an API gateway to a short-ID generation service that uses a distributed counter or pre-allocated ID ranges to avoid collisions without Redis locks. The read path is the hot path — it needs a multi-layer cache: CDN edge nodes first, then a Redis cluster with write-through semantics, then the DB as the source of truth.",
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: "m3",
    role: "ai",
    content: "Solid foundation. You mentioned pre-allocated ID ranges — how would you handle the case where a service node crashes mid-allocation? You've been given IDs 1,000,001 to 2,000,000 but only used 400,000 of them before dying. Do those IDs get wasted? And at 10B URLs, does that matter?",
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
];

// ─── Interview Report ────────────────────────────────────────────────────────
export const mockReport: InterviewReport = {
  sessionId: "s_XK91P",
  userId: "u_01JK5M9X",
  overallScore: 82,
  overallGrade: "A",
  gradeBand: "high",
  percentile: 91,
  completedAt: "2025-02-20T12:30:00Z",
  roundScores: {
    aptitude: 78,
    coding: 87,
    technical: 80,
    hr: 88,
  },
  radarData: [
    { subject: "Aptitude", score: 78, fullMark: 100 },
    { subject: "Coding", score: 87, fullMark: 100 },
    { subject: "Technical", score: 80, fullMark: 100 },
    { subject: "HR", score: 88, fullMark: 100 },
    { subject: "Communication", score: 85, fullMark: 100 },
    { subject: "Problem Solving", score: 83, fullMark: 100 },
  ],
  aiNarrative:
    "Arjun demonstrated exceptional command of distributed systems and algorithmic thinking — his URL shortener design showed genuine production-level reasoning, not just textbook recall. The coding round was a highlight: the circular subarray solution was correct, efficient, and explained clearly during walkthrough. The HR round showed strong self-awareness and structured communication; the STAR responses were specific and non-generic. The one area that dragged the overall score below A+ was system design depth on the failure-handling question — the answer was good but stayed at the component level rather than reasoning through consistency-availability tradeoffs. This is fixable with targeted CAP theorem and distributed consensus practice.",
  strengths: [
    "Distributed systems architecture — top 8% in this cohort",
    "Algorithm design — correct approach with optimal complexity on all 3 coding problems",
    "Behavioral communication — structured, specific STAR responses with genuine examples",
    "Verbal reasoning — 91/100, strongest single category",
  ],
  improvements: [
    "System design failure scenarios — stay in the consistency-availability tradeoff layer longer",
    "Quantitative aptitude — permutations/combinations category: 2/5 correct",
    "Dynamic programming — correctly identified optimal substructure but took 34 minutes",
  ],
  recommendations: [
    { title: "Designing Data-Intensive Applications", platform: "Book", url: "#", priority: "high", type: "course" },
    { title: "CAP Theorem Deep Dive", platform: "MIT OpenCourseWare", url: "#", priority: "high", type: "course" },
    { title: "DP Patterns — Blind 75", platform: "LeetCode", url: "#", priority: "medium", type: "practice" },
    { title: "Permutations & Combinations", platform: "Khan Academy", url: "#", priority: "medium", type: "course" },
  ],
  proctoringFlags: 1,
  benchmarkComparison: 14,
};

// ─── Officer Dashboard ───────────────────────────────────────────────────────
const generateStudents = (): BatchStudent[] => {
  const names = ["Priya Sharma", "Rahul Gupta", "Ananya Singh", "Vikram Patel", "Sneha Reddy", "Karthik Nair", "Divya Menon", "Aryan Kapoor", "Meera Joshi", "Rohit Kumar", "Aisha Khan", "Dev Malhotra"];
  return names.map((name, i) => {
    // Deterministic calculation based on index i (avoids hydration mismatch)
    const score = 45 + ((i * 13 + 7) % 46);
    
    // Deterministic dates: use a base date instead of Date.now()
    const lastActiveDate = new Date("2026-07-01T12:00:00Z");
    lastActiveDate.setDate(lastActiveDate.getDate() - (i % 7));

    return {
      id: `u_${String(i + 1).padStart(5, "0")}`,
      name,
      email: `${name.toLowerCase().replace(" ", ".")}@college.edu`,
      college: ["IIT Bombay", "IIT Delhi", "NIT Trichy", "BITS Pilani", "IIT Madras"][i % 5],
      degree: "B.Tech CS",
      graduationYear: 2025,
      readinessScore: score,
      gradeBand: score >= 75 ? "high" : score >= 50 ? "mid" : "low",
      grade: score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+" : score >= 60 ? "B" : "C",
      sessionsCompleted: ((i * 3 + 2) % 8) + 1,
      lastActive: lastActiveDate.toISOString(),
      roundScores: {
        aptitude: 55 + ((i * 7 + 3) % 31),
        coding: 50 + ((i * 11 + 5) % 36),
        technical: 55 + ((i * 9 + 4) % 31),
        hr: 60 + ((i * 5 + 2) % 26),
      },
    };
  });
};

const officerStudents = generateStudents();

export const mockOfficerDashboard: OfficerDashboard = {
  totalStudents: 248,
  avgReadiness: 71,
  placedStudents: 142,
  activeToday: 34,
  distribution: [
    { band: "A (80–100)", count: 58 },
    { band: "B (60–79)", count: 112 },
    { band: "C (40–59)", count: 62 },
    { band: "D (<40)", count: 16 },
  ],
  topPerformers: officerStudents.slice(0, 5),
  students: officerStudents,
};

// ─── Resume Data ─────────────────────────────────────────────────────────────
export const mockResumeData: ResumeData = {
  fileName: "arjun_mehta_resume.pdf",
  uploadedAt: "2025-02-18T10:00:00Z",
  parsedSkills: ["Python", "React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "Kubernetes", "ML", "PyTorch", "FastAPI", "GraphQL"],
  parsedExperience: [
    "SDE Intern, Amazon (6 months) — Built microservice for real-time inventory sync",
    "Research Assistant, IIT Bombay ML Lab (1 year) — Transformer fine-tuning for NLP tasks",
  ],
  jdMatchScore: 78,
  atsScore: 72,
  atsBreakdown: [
    { category: "Keywords Match", score: 82, maxScore: 100, suggestions: ["Add 'distributed systems'", "Include 'CI/CD' explicitly"] },
    { category: "Format & Readability", score: 91, maxScore: 100, suggestions: ["Consistent date format"] },
    { category: "Quantified Achievements", score: 58, maxScore: 100, suggestions: ["Add metrics to Amazon internship bullet", "Quantify ML research impact"] },
    { category: "Section Completeness", score: 85, maxScore: 100, suggestions: ["Add a skills summary section"] },
    { category: "Action Verbs", score: 76, maxScore: 100, suggestions: ["Replace 'Worked on' with stronger verbs like 'Engineered', 'Architected'"] },
  ],
  suggestions: [
    {
      original: "Worked on building microservices for the inventory system",
      suggested: "Engineered a real-time inventory sync microservice handling 50K req/s, reducing latency by 40%",
      reason: "Adds quantified impact and stronger action verb — critical for SDE roles at top-tier companies",
      impact: "high",
    },
    {
      original: "Did research on transformer models for NLP",
      suggested: "Fine-tuned BERT-based transformer models achieving 94.2% F1 on domain-specific NER tasks",
      reason: "Specificity signals genuine technical depth; vague research bullets are filtered by ATS",
      impact: "high",
    },
    {
      original: "Good knowledge of Python and React",
      suggested: "Remove this line — skills section covers this; redundancy reduces signal",
      reason: "ATS scores penalize redundant content; the skills section is already parsed",
      impact: "medium",
    },
  ],
};
