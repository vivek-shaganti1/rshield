export type CommentData = {
  id: string;
  author: string;
  body: string;
  createdAt: number;
  toxicity: number;
  isBrigadeCandidate?: boolean;
  isRepeatOffender?: boolean;
  autoRemoved?: boolean;
  clusterParticipant?: boolean; // Part of a conflict cluster
};

export type MetricPoint = {
  timestamp: number;
  riskScore: number;
  toxicity: number;
  replyVelocity: number;
  threatLevel?: ThreatLevel;
};

// 5-Stage Threat Evolution System (FIX 1)
export type ThreatLevel = 'stable' | 'elevated' | 'hostile' | 'critical' | 'containment';

// Threat history timeline entry (FIX 4)
export type ThreatHistoryEntry = {
  timestamp: number;
  threatLevel: ThreatLevel;
  riskScore: number;
  trigger?: string; // e.g. "rapid hostile replies", "brigade detected"
};

// Comment cluster detection (FIX 5)
export type CommentCluster = {
  participants: string[]; // usernames in repeated conflict
  hostileExchanges: number;
  clusterType: 'flamewar' | 'brigade' | 'repeat_conflict';
};

// Recovery state progression (FIX 6)
export type RecoveryState = 'none' | 'containment_active' | 'hostility_reduced' | 'recovery_monitoring' | 'stability_restored';

export type ThreadState = {
  id: string;
  title: string;
  author: string;
  createdAt: number;
  riskScore: number;
  toxicity: number;
  replyVelocity: number;
  reports: number;
  repeatOffendersCount: number;
  keywordVolatility: number;
  status: 'calm' | 'warning' | 'critical' | 'brigaded' | 'locked' | 'quarantined';
  recentComments: CommentData[];
  metricsHistory: MetricPoint[];
  aiSummary?: string;
  aiRecommendations?: string[];
  slowModeEnabled?: boolean;
  locked?: boolean;
  quarantined?: boolean;
  lastUpdatedAt?: number; // Time-based threat decay calculation

  // Auto-intervention tracking
  autoLocked?: boolean;
  brigadeDetected?: boolean;
  autoRemovedCount?: number;
  lastActionBy?: string; // 'rshield_ai' | 'moderator'

  // FIX 1: Threat Evolution System
  threatLevel?: ThreatLevel;
  previousThreatLevel?: ThreatLevel;
  threatLevelChangedAt?: number;

  // FIX 4: Threat History Timeline
  threatHistory?: ThreatHistoryEntry[];

  // FIX 5: Comment Cluster Detection
  commentClusters?: CommentCluster[];
  clusterDetected?: boolean;

  // FIX 6: Recovery State
  recoveryState?: RecoveryState;
  recoveryStartedAt?: number;

  // FIX 8: AI Confidence Scores
  escalationProbability?: number; // 0–100
  escalationConfidence?: 'LOW' | 'MEDIUM' | 'HIGH';

  // Escalation reason factors (FIX 3 contextual summaries)
  escalationFactors?: string[];
  targetRiskScore?: number;
};

export type SubredditHealth = {
  healthScore: number;
  activeAlertsCount: number;
  moderatorActionsCount: number;
  totalThreadsTracked: number;
  status: 'calm' | 'degraded' | 'crisis';
  // Real API verification
  redisConnected?: boolean;
  redditApiConnected?: boolean;
  autoInterventionsCount?: number;

  // FIX 9: Health Metrics Panel
  communityStability?: number; // 0–100
  hostilityVelocity?: 'rising' | 'stable' | 'falling';
  moderatorLoad?: 'Low' | 'Moderate' | 'High';
};

export type DashboardData = {
  subredditName: string;
  health: SubredditHealth;
  threads: ThreadState[];
  systemLogs: string[];
  simulationActive: boolean;
  simulationScene: number;
  username?: string;
  isModerator?: boolean;
};

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  dashboardData: DashboardData;
};

// Tracks whether the Reddit API call itself succeeded (vs. just Redis state)
export type RedditApiCallResult = {
  called: boolean;
  success: boolean;
  detail: string;
};

export type ActionResponse = {
  success: boolean;
  message: string;
  threadState?: ThreadState;
  redditApiResult?: RedditApiCallResult;
};

export type SimulationResponse = {
  success: boolean;
  message: string;
  dashboardData: DashboardData;
};

// System verification response (tests live Redis + Reddit API)
export type VerifyCheck = {
  status: 'ok' | 'fail' | 'skip';
  detail: string;
};

export type VerifyResponse = {
  overall: 'healthy' | 'degraded' | 'critical';
  checks: {
    redis: VerifyCheck;
    redditAuth: VerifyCheck;
    triggersRegistered: VerifyCheck;
    autoIntervention: VerifyCheck;
    toxicityEngine: VerifyCheck;
  };
  timestamp: string;
};
