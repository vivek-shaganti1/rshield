import { redis, context } from '@devvit/web/server';
import type { ThreadState, DashboardData, SubredditHealth, ThreatLevel, ThreatHistoryEntry } from '../../shared/api';
import {
  classifyThreatLevel,
  detectCommentClusters,
  calculateEscalationProbability,
  THREAT_LEVEL_ORDER,
} from './riskEngine';

const DEFAULT_HEALTH: SubredditHealth = {
  healthScore: 98,
  activeAlertsCount: 0,
  moderatorActionsCount: 2,
  totalThreadsTracked: 1,
  status: 'calm',
  communityStability: 96,
  hostilityVelocity: 'stable',
  moderatorLoad: 'Low',
};

// Generates mock historical points with threat levels
const generateMockHistory = (baseRisk: number, count = 10) => {
  const points = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const drift = Math.sin(i * 0.8) * 5 + (Math.random() - 0.5) * 3;
    const riskScore = Math.max(5, Math.min(100, Math.round(baseRisk + drift)));
    points.push({
      timestamp: now - i * 60000,
      riskScore,
      toxicity: Math.max(2, Math.min(100, Math.round(baseRisk * 0.8 + drift))),
      replyVelocity: Math.max(1, Math.round((baseRisk / 10) + drift * 0.1)),
      threatLevel: classifyThreatLevel(riskScore),
    });
  }
  return points;
};

// Build an initial threat history from baseRisk
const buildThreatHistory = (baseRisk: number, count = 5): ThreatHistoryEntry[] => {
  const now = Date.now();
  const entries: ThreatHistoryEntry[] = [];
  let lastLevel: ThreatLevel | null = null;
  for (let i = count - 1; i >= 0; i--) {
    const drift = (Math.random() - 0.5) * 10;
    const r = Math.max(0, Math.min(100, baseRisk + drift));
    const level = classifyThreatLevel(r);
    if (level !== lastLevel) {
      entries.push({
        timestamp: now - i * 120000,
        threatLevel: level,
        riskScore: Math.round(r),
        trigger: i === 0 ? 'current state' : undefined,
      });
      lastLevel = level;
    }
  }
  return entries;
};

// Simple baseline data so app works immediately
const getInitialDashboard = (username: string): DashboardData => {
  const defaultThreadId = 't3_default_discussion';
  const defaultThread: ThreadState = {
    id: defaultThreadId,
    title: 'Weekly Community Cafe - Cozy Chats & Hobbies',
    author: 'AutoModerator',
    createdAt: Date.now() - 3600000,
    riskScore: 8,
    toxicity: 2,
    replyVelocity: 1.2,
    reports: 0,
    repeatOffendersCount: 0,
    keywordVolatility: 0,
    status: 'calm',
    recentComments: [
      {
        id: 't1_c1',
        author: 'UserA',
        body: 'I really like the new design guidelines. Good job, mods!',
        createdAt: Date.now() - 600000,
        toxicity: 0,
      },
      {
        id: 't1_c2',
        author: 'GardeningLover',
        body: 'Anyone else starting their summer tomatoes early this year?',
        createdAt: Date.now() - 1200000,
        toxicity: 0,
      },
    ],
    metricsHistory: generateMockHistory(8),
    aiSummary: 'The community is highly stable. General chat is welcoming and constructive.',
    aiRecommendations: [
      'Maintain routine background passive monitoring.',
      'No moderator action required.',
    ],
    slowModeEnabled: false,
    locked: false,
    quarantined: false,
    threatLevel: 'stable',
    threatHistory: buildThreatHistory(8),
    escalationProbability: 4,
    escalationConfidence: 'LOW',
    escalationFactors: [],
    clusterDetected: false,
    commentClusters: [],
    recoveryState: 'none',
  };

  return {
    subredditName: context.subredditName || 'r/rshield_dev',
    health: DEFAULT_HEALTH,
    threads: [defaultThread],
    systemLogs: [
      `[${new Date().toISOString().slice(11, 19)}] rShield AI Core initialized.`,
      `[${new Date().toISOString().slice(11, 19)}] Tracking active subreddit r/${context.subredditName || 'rshield_dev'}.`,
    ],
    simulationActive: false,
    simulationScene: 1,
    username,
  };
};

export const getDashboardData = async (username: string): Promise<DashboardData> => {
  try {
    const raw = await redis.get('rshield_dashboard');
    if (!raw) {
      const initial = getInitialDashboard(username);
      await redis.set('rshield_dashboard', JSON.stringify(initial));
      for (const t of initial.threads) {
        await redis.set(`rshield_thread:${t.id}`, JSON.stringify(t));
      }
      return initial;
    }
    const parsed: DashboardData = JSON.parse(raw);
    parsed.username = username;

    // Decay each thread dynamically
    for (let i = 0; i < parsed.threads.length; i++) {
      const t = parsed.threads[i];
      if (t) {
        const activeThread = await getThread(t.id);
        if (activeThread) {
          parsed.threads[i] = activeThread;
        }
      }
    }

    // Recalculate subreddit-wide health metrics (FIX 9)
    parsed.health = computeHealthMetrics(parsed.threads, parsed.health);

    // Sort: simulation thread pinned at top when active, others by riskScore descending
    parsed.threads.sort((a, b) => {
      if (a.id === 't3_simulated_debate' && parsed.simulationActive) return -1;
      if (b.id === 't3_simulated_debate' && parsed.simulationActive) return 1;
      return b.riskScore - a.riskScore;
    });

    return parsed;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return getInitialDashboard(username);
  }
};

// FIX 9: Compute subreddit-wide health metrics
const computeHealthMetrics = (threads: ThreadState[], existingHealth: SubredditHealth): SubredditHealth => {
  if (threads.length === 0) return existingHealth;

  let totalRisk = 0;
  let risingThreads = 0;
  let criticalAlerts = 0;

  threads.forEach(t => {
    totalRisk += t.riskScore;
    if (t.threatLevel === 'critical' || t.threatLevel === 'containment') criticalAlerts++;
    if (t.replyVelocity > 8) risingThreads++;
  });

  const avgRisk = totalRisk / threads.length;
  const communityStability = Math.round(Math.max(10, 100 - avgRisk));

  let hostilityVelocity: 'rising' | 'stable' | 'falling' = 'stable';
  if (risingThreads > 0 && avgRisk > 40) hostilityVelocity = 'rising';
  else if (avgRisk < 25) hostilityVelocity = 'falling';

  let moderatorLoad: 'Low' | 'Moderate' | 'High' = 'Low';
  if (criticalAlerts > 0 || avgRisk > 60) moderatorLoad = 'High';
  else if (avgRisk > 35) moderatorLoad = 'Moderate';

  const healthScore = Math.round(Math.max(10, 100 - avgRisk));
  let status: 'calm' | 'degraded' | 'crisis' = 'calm';
  if (healthScore <= 50) status = 'crisis';
  else if (healthScore <= 80) status = 'degraded';

  return {
    ...existingHealth,
    healthScore,
    communityStability,
    hostilityVelocity,
    moderatorLoad,
    activeAlertsCount: criticalAlerts,
    status,
  };
};

export const saveDashboardData = async (data: DashboardData): Promise<void> => {
  await redis.set('rshield_dashboard', JSON.stringify(data));
};

const getThreatChangeTrigger = (
  prev: ThreatLevel,
  next: ThreatLevel,
  thread: ThreadState
): string => {
  if (thread.locked) return 'Thread locked by moderator';
  if (thread.quarantined && next === 'containment') return 'Containment quarantine activated';
  if (thread.recoveryState === 'stability_restored') return 'Stability restored';

  const isRising = THREAT_LEVEL_ORDER.indexOf(next) > THREAT_LEVEL_ORDER.indexOf(prev);
  if (isRising) {
    switch (next) {
      case 'elevated':
        return 'Controversial keywords matching, reply velocity rising';
      case 'hostile':
        return thread.clusterDetected ? 'Hostile conflict cluster detected' : 'Repeated toxic comments from multiple accounts';
      case 'critical':
        return thread.replyVelocity > 15 ? 'Rapid reply velocity burst' : 'Severe toxicity rules violation';
      case 'containment':
        return thread.status === 'brigaded' ? 'Coordinated swarm brigade detected' : 'Meltdown risk threshold exceeded';
      default:
        return 'Toxicity escalation';
    }
  } else {
    switch (next) {
      case 'critical':
        return 'Suppression layer active, threat velocity stabilizing';
      case 'hostile':
        return thread.slowModeEnabled ? 'Threat throttling active' : 'Discussion velocity cooling down';
      case 'elevated':
        return 'Toxicity decay in progress';
      case 'stable':
        return 'Natural stabilization complete';
      default:
        return 'Discussion cooling down';
    }
  }
};

export const transitionRiskScore = (thread: ThreadState, elapsedMs: number) => {
  if (thread.targetRiskScore === undefined) {
    thread.targetRiskScore = thread.riskScore;
  }

  const now = Date.now();

  // 1. Natural decay of target if thread is not locked/quarantined (Fix 4)
  if (elapsedMs >= 20000 && !thread.locked && !thread.quarantined) {
    const intervals = Math.floor(elapsedMs / 20000);
    if (intervals > 0) {
      thread.targetRiskScore = Math.max(10, thread.targetRiskScore - intervals * 3);
      thread.toxicity = Math.max(2, thread.toxicity - intervals * 2);
      thread.replyVelocity = Math.max(0.1, thread.replyVelocity - intervals * 0.4);
      thread.keywordVolatility = Math.max(0, thread.keywordVolatility - intervals * 3);
    }
  }

  // 2. Gradually step current riskScore towards targetRiskScore (Fix 7)
  const diff = thread.targetRiskScore - thread.riskScore;
  if (diff !== 0) {
    // Step rate: 2.5 risk points per second for rise, 1.5 for fall
    const stepRate = diff > 0 ? 2.5 : 1.5;
    const maxStep = Math.max(1, Math.round((elapsedMs / 1000) * stepRate));

    const prevThreatLevel = thread.threatLevel || 'stable';

    if (Math.abs(diff) <= maxStep) {
      thread.riskScore = thread.targetRiskScore;
    } else {
      thread.riskScore += diff > 0 ? maxStep : -maxStep;
    }

    const newThreatLevel = classifyThreatLevel(thread.riskScore);
    thread.threatLevel = newThreatLevel;

    // Sync status if not overridden by lock/quarantine
    if (thread.status !== 'locked' && thread.status !== 'quarantined') {
      if (thread.riskScore < 35) thread.status = 'calm';
      else if (thread.riskScore < 65) thread.status = 'warning';
      else thread.status = 'critical';
    }

    // Record threat level change in history (FIX 4)
    if (newThreatLevel !== prevThreatLevel) {
      thread.threatHistory = thread.threatHistory || [];
      thread.threatHistory.push({
        timestamp: now,
        threatLevel: newThreatLevel,
        riskScore: thread.riskScore,
        trigger: getThreatChangeTrigger(prevThreatLevel, newThreatLevel, thread),
      });
      // Keep last 20 entries
      if (thread.threatHistory.length > 20) thread.threatHistory.shift();
    }
  } else {
    // Ensure threatLevel is always synchronized
    thread.threatLevel = classifyThreatLevel(thread.riskScore);
  }

  // Sync recovery state
  thread.recoveryState = computeRecoveryState(thread);
};

export const getThread = async (postId: string): Promise<ThreadState | null> => {
  try {
    const raw = await redis.get(`rshield_thread:${postId}`);
    if (!raw) return null;
    const thread: ThreadState = JSON.parse(raw);

    const now = Date.now();
    const lastUpdate = thread.lastUpdatedAt || thread.createdAt || now;
    const elapsedMs = now - lastUpdate;

    // Transition risk score and update timestamps
    transitionRiskScore(thread, elapsedMs);
    thread.lastUpdatedAt = now;

    // Always refresh intelligence metrics on read
    const clusters = detectCommentClusters(thread.recentComments);
    thread.commentClusters = clusters;
    thread.clusterDetected = clusters.length > 0;

    const { probability, confidence, factors } = calculateEscalationProbability(thread);
    thread.escalationProbability = probability;
    thread.escalationConfidence = confidence;
    thread.escalationFactors = factors;

    // Save transitioned state
    await redis.set(`rshield_thread:${postId}`, JSON.stringify(thread));

    return thread;
  } catch (error) {
    console.error('Error in getThread decay:', error);
    return null;
  }
};

// FIX 6: Compute recovery state progression
const computeRecoveryState = (thread: ThreadState): ThreadState['recoveryState'] => {
  if ((thread.quarantined || thread.locked) && thread.riskScore > 60) return 'containment_active';
  if ((thread.quarantined || thread.locked) && thread.riskScore <= 60 && thread.riskScore > 35) return 'hostility_reduced';
  if ((thread.quarantined || thread.locked) && thread.riskScore <= 35 && thread.riskScore > 15) return 'recovery_monitoring';
  if (thread.riskScore <= 15) return 'stability_restored';
  return 'none';
};

export const saveThread = async (thread: ThreadState): Promise<void> => {
  // Enrich before saving
  if (thread.targetRiskScore === undefined) {
    thread.targetRiskScore = thread.riskScore;
  }
  thread.threatLevel = classifyThreatLevel(thread.riskScore);
  const clusters = detectCommentClusters(thread.recentComments);
  thread.commentClusters = clusters;
  thread.clusterDetected = clusters.length > 0;
  thread.recoveryState = computeRecoveryState(thread);

  const { probability, confidence, factors } = calculateEscalationProbability(thread);
  thread.escalationProbability = probability;
  thread.escalationConfidence = confidence;
  thread.escalationFactors = factors;

  await redis.set(`rshield_thread:${thread.id}`, JSON.stringify(thread));

  const dashboard = await getDashboardData('anonymous');
  const index = dashboard.threads.findIndex((t) => t.id === thread.id);
  if (index >= 0) {
    dashboard.threads[index] = thread;
  } else {
    dashboard.threads.unshift(thread);
  }
  await saveDashboardData(dashboard);
};

export const addLog = async (message: string): Promise<void> => {
  const dashboard = await getDashboardData('anonymous');
  const timestamp = new Date().toISOString().slice(11, 19);
  dashboard.systemLogs.unshift(`[${timestamp}] ${message}`);
  if (dashboard.systemLogs.length > 30) {
    dashboard.systemLogs.pop();
  }
  await saveDashboardData(dashboard);
};

// Preset data for our interactive simulation mode
export const setSimulationScene = async (scene: number): Promise<DashboardData> => {
  const dashboard = await getDashboardData('anonymous');
  dashboard.simulationActive = true;
  dashboard.simulationScene = scene;

  const simThreadId = 't3_simulated_debate';
  const now = Date.now();

  const rawThread = await redis.get(`rshield_thread:${simThreadId}`);
  let startRisk = 10;
  let startThreatHistory: ThreatHistoryEntry[] = [];
  if (rawThread) {
    try {
      const parsed: ThreadState = JSON.parse(rawThread);
      startRisk = parsed.riskScore;
      startThreatHistory = parsed.threatHistory || [];
    } catch (e) {
      console.error('Failed parsing existing simulated debate thread:', e);
    }
  }

  const thread: ThreadState = {
    id: simThreadId,
    title: 'DEBATE: Should pineapple pizza be banned from the sub? Mods are censoring opinions.',
    author: 'PineappleFanatic',
    createdAt: now - 1800000,
    riskScore: startRisk,
    toxicity: 0,
    replyVelocity: 1.0,
    reports: 0,
    repeatOffendersCount: 0,
    keywordVolatility: 0,
    status: 'calm',
    recentComments: [],
    metricsHistory: [],
    aiSummary: 'Monitoring thread...',
    aiRecommendations: [],
    slowModeEnabled: false,
    locked: false,
    quarantined: false,
    threatLevel: classifyThreatLevel(startRisk),
    threatHistory: startThreatHistory,
    escalationProbability: 5,
    escalationConfidence: 'LOW',
    escalationFactors: [],
    clusterDetected: false,
    commentClusters: [],
    recoveryState: 'none',
    targetRiskScore: startRisk,
  };

  const logTimestamp = () => new Date().toISOString().slice(11, 19);

  switch (scene) {
    case 1: // Stable Community
      thread.title = 'Weekly Community Café - Cozy Hobbies';
      thread.targetRiskScore = 8;
      if (!rawThread) {
        thread.riskScore = 8;
      }
      thread.toxicity = 3;
      thread.replyVelocity = 1.1;
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 4;
      thread.escalationConfidence = 'LOW';
      thread.escalationFactors = [];
      thread.recentComments = [
        { id: 'sc1_1', author: 'SnooBaker', body: 'Just finished coding my Devvit app, it is pretty neat!', createdAt: now - 300000, toxicity: 0 },
        { id: 'sc1_2', author: 'PizzaLover', body: 'Made a fresh pepperoni pie last night. Hobbies are great.', createdAt: now - 600000, toxicity: 0 },
      ];
      thread.metricsHistory = generateMockHistory(8);
      thread.threatHistory = thread.threatHistory || [];
      if (thread.threatHistory.length === 0) {
        thread.threatHistory = [
          { timestamp: now - 600000, threatLevel: 'stable', riskScore: 9, trigger: 'baseline monitoring' },
          { timestamp: now - 300000, threatLevel: 'stable', riskScore: 8, trigger: 'current state' },
        ];
      }
      thread.aiSummary = 'Thread operating within STABLE behavioral baselines. Threat Level: STABLE. Escalation probability: 4% (LOW confidence). User engagement is constructive with a positive sentiment ratio. No anomalies detected.';
      thread.aiRecommendations = [
        'Maintain routine background passive monitoring.',
        'Ensure automatic filtering remains active.',
        'No immediate moderator intervention required.',
      ];
      dashboard.health = {
        healthScore: 98, activeAlertsCount: 0, moderatorActionsCount: 0,
        totalThreadsTracked: 1, status: 'calm',
        communityStability: 96, hostilityVelocity: 'stable', moderatorLoad: 'Low',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] Simulation Mode: Scene 1 (Calm Baseline) activated.`);
      break;

    case 2: // Dangerous Post Appears
      thread.targetRiskScore = 32;
      thread.toxicity = 12;
      thread.replyVelocity = 2.5;
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 28;
      thread.escalationConfidence = 'MEDIUM';
      thread.escalationFactors = ['controversial topic gaining traction', 'elevated reply velocity (2.5/min)'];
      thread.recentComments = [
        { id: 'sc2_1', author: 'PineappleFanatic', body: 'Pineapple pizza is superior. If you disagree, you do not understand food.', createdAt: now - 60000, toxicity: 10 },
        { id: 'sc2_2', author: 'StandardSlice', body: 'Well, that is quite an opinion to post on a Sunday morning.', createdAt: now - 180000, toxicity: 5 },
      ];
      thread.metricsHistory = generateMockHistory(32);
      thread.threatHistory = thread.threatHistory || [];
      if (thread.threatHistory.length <= 2) {
        thread.threatHistory = [
          { timestamp: now - 900000, threatLevel: 'stable', riskScore: 10, trigger: 'thread created' },
          { timestamp: now - 300000, threatLevel: 'elevated', riskScore: 32, trigger: 'controversial post gaining traction' },
        ];
      }
      thread.aiSummary = 'Provocative thread created challenging subjective norms. Monitor velocity closely.';
      thread.aiRecommendations = [
        'Monitor thread velocity — watch for acceleration.',
        'Pre-emptively review flagged users\' comment history.',
        'Stand by for throttling activation if escalation continues.',
      ];
      dashboard.health = {
        healthScore: 88, activeAlertsCount: 0, moderatorActionsCount: 0,
        totalThreadsTracked: 1, status: 'calm',
        communityStability: 86, hostilityVelocity: 'stable', moderatorLoad: 'Low',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] Simulation Mode: Scene 2 (Controversial Post Created) activated.`);
      break;

    case 3: // Escalation Begins
      thread.targetRiskScore = 54;
      thread.toxicity = 45;
      thread.replyVelocity = 8.5;
      thread.reports = 3;
      thread.repeatOffendersCount = 1;
      thread.keywordVolatility = 20;
      thread.status = 'warning';
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 62;
      thread.escalationConfidence = 'HIGH';
      thread.escalationFactors = [
        'rapid hostile replies',
        'repeated keyword volatility (censorship, idiot)',
        'abnormal engagement velocity (8.5/min)',
        'repeat offender flagged',
      ];
      thread.clusterDetected = true;
      thread.commentClusters = [{ participants: ['AngryGourmet', 'PineappleFanatic'], hostileExchanges: 2, clusterType: 'flamewar' }];
      thread.recentComments = [
        { id: 'sc3_1', author: 'AngryGourmet', body: 'Censorship in real-time! Mods will ban me, but you are a complete idiot.', createdAt: now - 30000, toxicity: 65, isRepeatOffender: true },
        { id: 'sc3_2', author: 'PineappleFanatic', body: 'Shut up, your opinion is absolute trash.', createdAt: now - 90000, toxicity: 55 },
        { id: 'sc3_3', author: 'StandardSlice', body: 'Whoa, let is keep it civilized guys.', createdAt: now - 150000, toxicity: 0 },
      ];
      thread.metricsHistory = generateMockHistory(54);
      thread.threatHistory = thread.threatHistory || [];
      if (thread.threatHistory.length <= 3) {
        thread.threatHistory = [
          { timestamp: now - 900000, threatLevel: 'stable', riskScore: 10, trigger: 'thread created' },
          { timestamp: now - 600000, threatLevel: 'elevated', riskScore: 32, trigger: 'controversial post' },
          { timestamp: now - 180000, threatLevel: 'hostile', riskScore: 54, trigger: 'rapid hostile replies' },
        ];
      }
      thread.aiSummary = 'Flamewar risk emerging. Rapid hostile response velocity. Sensitive keywords triggered ("censorship", "idiot").';
      thread.aiRecommendations = [
        'Activate Threat Throttling to suppress heated comment bursts.',
        'Manually inspect recent replies by flagged repeat offenders.',
        'Pre-emptively flag thread for priority review if velocity rises.',
      ];
      dashboard.health = {
        healthScore: 71, activeAlertsCount: 1, moderatorActionsCount: 0,
        totalThreadsTracked: 1, status: 'degraded',
        communityStability: 68, hostilityVelocity: 'rising', moderatorLoad: 'Moderate',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] ALERT: Escalation warning. Thread risk at 54%. Hostility rising.`);
      break;

    case 4: // Critical Meltdown
      thread.targetRiskScore = 89;
      thread.toxicity = 82;
      thread.replyVelocity = 28.0;
      thread.reports = 18;
      thread.repeatOffendersCount = 3;
      thread.keywordVolatility = 45;
      thread.status = 'critical';
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 94;
      thread.escalationConfidence = 'HIGH';
      thread.escalationFactors = [
        'meltdown threshold breached',
        'coordinated conflict cluster active',
        '3 repeat offenders active',
        '18 user reports logged',
        'extreme keyword volatility',
      ];
      thread.clusterDetected = true;
      thread.commentClusters = [
        { participants: ['BrigadeUser_9', 'AngryGourmet', 'AltAccount_44', 'PineappleFanatic'], hostileExchanges: 4, clusterType: 'brigade' },
      ];
      thread.recentComments = [
        { id: 'sc4_1', author: 'BrigadeUser_9', body: 'RAID THIS THREAD! SHIT MODS ARE POWER TRIPPING AS USUAL!', createdAt: now - 10000, toxicity: 95, isBrigadeCandidate: true },
        { id: 'sc4_2', author: 'AngryGourmet', body: 'Trash moderators censoring everything! Absolutely pathetic, power-tripping clowns!', createdAt: now - 20000, toxicity: 90, isRepeatOffender: true },
        { id: 'sc4_3', author: 'PineappleFanatic', body: 'STFU you absolute garbage troll. Leave the sub!', createdAt: now - 40000, toxicity: 85 },
        { id: 'sc4_4', author: 'AltAccount_44', body: 'Banning pizza posts now? This is rigged garbage, worst admin team ever.', createdAt: now - 60000, toxicity: 80 },
      ];
      thread.metricsHistory = generateMockHistory(89);
      thread.threatHistory = thread.threatHistory || [];
      if (thread.threatHistory.length <= 4) {
        thread.threatHistory = [
          { timestamp: now - 900000, threatLevel: 'stable', riskScore: 10, trigger: 'thread created' },
          { timestamp: now - 600000, threatLevel: 'elevated', riskScore: 32, trigger: 'controversial post' },
          { timestamp: now - 300000, threatLevel: 'hostile', riskScore: 54, trigger: 'flamewar detected' },
          { timestamp: now, threatLevel: 'containment', riskScore: 89, trigger: 'CONTAINMENT THRESHOLD BREACHED' },
        ];
      }
      thread.aiSummary = 'CRITICAL ALARM: Coordinated brigading swarm suspected. High velocity (28/min) with extreme toxicity levels. Multiple reports logged.';
      thread.aiRecommendations = [
        'Execute immediate Thread Lock to stop toxicity propagation.',
        'Activate Threat Throttling subreddit-wide.',
        'Quarantine active brigaders and repeat violators.',
      ];
      dashboard.health = {
        healthScore: 35, activeAlertsCount: 3, moderatorActionsCount: 0,
        totalThreadsTracked: 1, status: 'crisis',
        communityStability: 32, hostilityVelocity: 'rising', moderatorLoad: 'High',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] CRITICAL: Thread meltdown. Risk score 89%. Coordinated brigading indicators active.`);
      break;

    case 5: // Moderator Intervention (Pending moderator click on recommendations)
      thread.targetRiskScore = 89;
      thread.status = 'critical';
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 94;
      thread.escalationConfidence = 'HIGH';
      thread.metricsHistory = generateMockHistory(89);
      thread.threatHistory = thread.threatHistory || [];
      if (thread.threatHistory.length <= 4) {
        thread.threatHistory = [
          { timestamp: now - 600000, threatLevel: 'stable', riskScore: 10, trigger: 'thread created' },
          { timestamp: now - 300000, threatLevel: 'hostile', riskScore: 54, trigger: 'flamewar detected' },
          { timestamp: now, threatLevel: 'containment', riskScore: 89, trigger: 'AWAITING MODERATOR INTERVENTION' },
        ];
      }
      thread.aiSummary = 'System waiting for moderator intervention commands. Recommended action: Lock Thread.';
      thread.aiRecommendations = [
        'Execute LOCK ACTION immediately.',
        'Deploy AutoMod quarantine rule.',
        'Activate emergency recovery surveillance.'
      ];
      dashboard.health = {
        healthScore: 35, activeAlertsCount: 3, moderatorActionsCount: 0,
        totalThreadsTracked: 1, status: 'crisis',
        communityStability: 32, hostilityVelocity: 'rising', moderatorLoad: 'High',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] Action Required: Awaiting moderator execution confirmation.`);
      break;

    case 6: { // Crisis Stabilized
      thread.targetRiskScore = 15;
      thread.toxicity = 5;
      thread.replyVelocity = 0.2;
      thread.status = 'locked';
      thread.locked = true;
      thread.slowModeEnabled = true;
      thread.threatLevel = classifyThreatLevel(thread.riskScore);
      thread.escalationProbability = 6;
      thread.escalationConfidence = 'LOW';
      thread.escalationFactors = ['threat neutralized — recovery monitoring active'];
      thread.recoveryState = 'stability_restored';
      thread.clusterDetected = false;
      thread.commentClusters = [];
      thread.recentComments = [
        { id: 'sc6_system', author: 'rShield_AI', body: '🔒 This thread has been locked by rShield. Subreddit health is stabilizing.', createdAt: now - 5000, toxicity: 0 },
        { id: 'sc6_1', author: 'BrigadeUser_9', body: '[COMMENT REMOVED BY MODERATOR]', createdAt: now - 12000, toxicity: 0 },
        { id: 'sc6_2', author: 'AngryGourmet', body: '[COMMENT FILTERED]', createdAt: now - 22000, toxicity: 0 },
      ];
      // Create a sharp drop in history
      const history = generateMockHistory(89, 9);
      history.push({ timestamp: now, riskScore: 15, toxicity: 5, replyVelocity: 0, threatLevel: 'stable' });
      thread.metricsHistory = history;
      thread.threatHistory = [
        { timestamp: now - 900000, threatLevel: 'stable', riskScore: 10, trigger: 'thread created' },
        { timestamp: now - 600000, threatLevel: 'elevated', riskScore: 32, trigger: 'controversial post' },
        { timestamp: now - 400000, threatLevel: 'hostile', riskScore: 54, trigger: 'flamewar detected' },
        { timestamp: now - 200000, threatLevel: 'critical', riskScore: 89, trigger: 'brigade detected' },
        { timestamp: now - 60000, threatLevel: 'critical', riskScore: 50, trigger: 'moderator locked thread' },
        { timestamp: now, threatLevel: 'stable', riskScore: 15, trigger: 'STABILITY RESTORED ✓' },
      ];
      thread.aiSummary = 'Crisis resolved. Thread locked. Toxic engagements halted. Subreddit health restoring to baseline levels.';
      thread.aiRecommendations = ['Threat successfully neutralized.', 'Unlock scheduled in 24 hours.'];
      dashboard.health = {
        healthScore: 94, activeAlertsCount: 0, moderatorActionsCount: 2,
        totalThreadsTracked: 1, status: 'calm',
        communityStability: 91, hostilityVelocity: 'falling', moderatorLoad: 'Low',
      };
      dashboard.systemLogs.unshift(`[${logTimestamp()}] Thread ${simThreadId} LOCKED. Threat Throttling applied. Subreddit health restored to 94%.`);
      break;
    }
  }

  // Update in dashboard threads list
  const idx = dashboard.threads.findIndex((t) => t.id === simThreadId);
  if (idx >= 0) {
    dashboard.threads[idx] = thread;
  } else {
    dashboard.threads.unshift(thread);
  }

  await saveDashboardData(dashboard);
  await saveThread(thread);
  return dashboard;
};

// ─── Real Subreddit Scanner Merge ──────────────────────────────────────────────
// Called from api.ts after scanSubredditPosts() runs on every /dashboard poll.
// Merges newly discovered real Reddit posts into the persisted dashboard without
// overwriting existing tracked thread intelligence data.
export const mergeScannedThreadsIntoDashboard = async (
  scannedThreads: ThreadState[]
): Promise<void> => {
  try {
    const raw = await redis.get('rshield_dashboard');
    if (!raw) {
      // Dashboard not yet initialized — scanned threads will be saved individually
      // via saveThread calls inside the scanner itself; nothing to merge yet.
      return;
    }
    const dashboard: DashboardData = JSON.parse(raw);
    let changed = false;

    for (const scanned of scannedThreads) {
      // Skip the hardcoded defaults so they are never duplicated
      if (
        scanned.id === 't3_default_discussion' ||
        scanned.id === 't3_simulated_debate'
      ) continue;

      const idx = dashboard.threads.findIndex((t) => t.id === scanned.id);
      if (idx >= 0) {
        // Thread already tracked — only refresh lock state from live Reddit
        const existing = dashboard.threads[idx];
        if (existing) {
          if (existing.locked !== scanned.locked) {
            existing.locked = scanned.locked;
            existing.status = scanned.locked ? 'locked' : existing.status;
            // Persist the refreshed individual thread state too
            await redis.set(`rshield_thread:${existing.id}`, JSON.stringify(existing));
            changed = true;
          }
        }
      } else {
        // Brand-new real post discovered — add it to the dashboard
        dashboard.threads.push(scanned);
        changed = true;
      }
    }

    if (changed) {
      // Sort: highest riskScore first; keep simulation thread pinned at top when
      // a simulation is actively running.
      dashboard.threads.sort((a, b) => {
        if (a.id === 't3_simulated_debate' && dashboard.simulationActive) return -1;
        if (b.id === 't3_simulated_debate' && dashboard.simulationActive) return 1;
        return b.riskScore - a.riskScore;
      });
      await redis.set('rshield_dashboard', JSON.stringify(dashboard));
    }
  } catch (err) {
    console.error('[mergeScannedThreadsIntoDashboard] Error:', err);
  }
};
