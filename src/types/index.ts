export interface RawJob {
  title: string;
  company: string;
  location?: string;
  locationType?: string;
  url: string;
  source: string;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experienceLevel?: string;
  companySize?: string;
  industry?: string;
  tags?: string[];
  postedAt?: Date;
}

export interface SearchConfigData {
  titles: string[];
  locations: string[];
  locationType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  companySize?: string;
  industries: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  blacklistedCompanies: string[];
}

export interface JobFilters {
  status?: string;
  search?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: "matchScore" | "createdAt" | "postedAt";
  sortOrder?: "asc" | "desc";
}

export interface JobMatchBreakdownItem {
  key: "title" | "location" | "salary" | "keywords" | "experience" | "blacklist";
  label: string;
  score: number;
  maxScore: number;
  reason: string;
  tone: "positive" | "neutral" | "negative";
}

export interface JobMatchDetails {
  totalScore: number;
  breakdown: JobMatchBreakdownItem[];
}

export interface JobPriorityInsights {
  effortScore: number;
  priorityScore: number;
  recommendation: "quick-win" | "best-bet" | "stretch" | "low-priority";
  effortLabel: "Low Effort" | "Medium Effort" | "High Effort";
  reason: string;
}

export interface TailorSuggestion {
  original: string;
  improved: string;
  reason: string;
}

export interface ResumeData {
  id: string;
  name: string;
  fileName: string;
  format: string;
  isPrimary: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  analysisCount?: number;
  jobAnalysis?: {
    jobId: string;
    matchScore: number;
    missingKeywordsCount: number;
    presentKeywordsCount: number;
    createdAt: string;
  } | null;
}

export interface ResumeAnalysisData {
  id: string;
  resumeId: string;
  jobId: string;
  matchScore: number;
  presentKeywords: string[];
  missingKeywords: string[];
  suggestions: TailorSuggestion[];
  summary: string;
  createdAt: string;
  job?: {
    id: string;
    title: string;
    company: string;
    location?: string;
    locationType?: string;
    matchScore: number;
  };
}

export interface TailorInput {
  resumeText: string;
  jobTitle: string;
  jobDescription: string;
  jobTags: string[];
}

export interface TimelineEvent {
  id: string;
  type: "status_change" | "note_added" | "follow_up_set" | "recruiter_added" | "manual";
  description: string;
  timestamp: string;
}

export interface ApplicationData {
  id: string;
  jobId: string;
  status: string;
  notes: string;
  recruiterName: string;
  recruiterEmail: string;
  recruiterLinkedIn: string;
  followUpDate: string | null;
  appliedAt: string | null;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    locationType?: string;
    matchScore: number;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    url: string;
    tags: string[];
  };
}

export const KANBAN_COLUMNS = [
  { status: "bookmarked", label: "Bookmarked", color: "indigo" },
  { status: "applied",    label: "Applied",    color: "blue"   },
  { status: "interview",  label: "Interview",  color: "amber"  },
  { status: "offer",      label: "Offer",      color: "green"  },
  { status: "rejected",   label: "Rejected",   color: "slate"  },
] as const;

export type KanbanStatus = typeof KANBAN_COLUMNS[number]["status"];

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface ScoreBucket {
  bucket: string;
  count: number;
}

export interface WeeklyTrend {
  week: string;
  avgScore: number;
  jobCount: number;
}

export interface TopEntry {
  name: string;
  count: number;
  avgScore: number;
}

export interface SourceConversion {
  source: string;
  totalJobs: number;
  appliedCount: number;
  interviewCount: number;
  avgScore: number;
}

export interface WeeklyActivity {
  jobsScraped: number;
  applicationsCreated: number;
  interviewsScheduled: number;
  analysesCreated: number;
  overdueFollowUps: number;
  avgMatchScore: number;
}

export interface ResumePerformance {
  resumeId: string;
  name: string;
  analysisCount: number;
  avgScore: number;
  bestScore: number;
}

export interface KeywordGap {
  keyword: string;
  count: number;
}

export interface AnalyticsData {
  funnel: FunnelStage[];
  scoreBuckets: ScoreBucket[];
  weeklyTrend: WeeklyTrend[];
  topTitles: TopEntry[];
  topCompanies: TopEntry[];
  sourceConversions: SourceConversion[];
  resumePerformance: ResumePerformance[];
  topMissingKeywords: KeywordGap[];
  weeklyActivity: WeeklyActivity;
  generatedAt: string;
}
