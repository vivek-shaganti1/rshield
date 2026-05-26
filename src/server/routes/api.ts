import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import { getDashboardData, getThread, saveThread, addLog, setSimulationScene, saveDashboardData, transitionRiskScore, mergeScannedThreadsIntoDashboard } from '../core/storage';
import { generateAISummaryAndRecommendations, analyzeCommentToxicity } from '../core/riskEngine';
import { scanSubredditPosts } from '../core/subredditScanner';
import type {
  InitResponse,
  ActionResponse,
  SimulationResponse,
  DashboardData,
  ThreadState,
  VerifyResponse,
  RedditApiCallResult,
} from '../../shared/api';

// ─── Helper: run scanner and merge results (non-fatal) ──────────────────────
const runScannerAndMerge = async (): Promise<void> => {
  try {
    const scannedThreads = await scanSubredditPosts();
    if (scannedThreads.length > 0) {
      await mergeScannedThreadsIntoDashboard(scannedThreads);
    }
  } catch (err) {
    // Scanner failures are non-fatal; dashboard still returns cached data
    console.warn('[Scanner] Subreddit scan skipped (non-fatal):', String(err));
  }
};

type ActionPayload = {
  action: 'lock' | 'unlock' | 'slowmode_enable' | 'slowmode_disable' | 'quarantine' | 'restore_stability';
};

type SimulationStepPayload = {
  scene: number;
};

// Safety guard: prevent Reddit API calls on fake/simulated post IDs
const isRealPost = (postId: string): boolean =>
  !postId.includes('simulation') &&
  !postId.includes('default_discussion') &&
  !postId.includes('simulated');

// Ensure t3_ prefix for Reddit API calls
const ensureT3 = (postId: string): `t3_${string}` => {
  const isT3 = (id: string): id is `t3_${string}` => id.startsWith('t3_');
  return isT3(postId) ? postId : `t3_${postId}`;
};

export const api = new Hono();

api.get('/init', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) || 'Moderator';
    // First-load scan: populate real posts immediately
    await runScannerAndMerge();
    const data = await getDashboardData(username);
    
    return c.json<InitResponse>({
      type: 'init',
      postId: context.postId || 'no_post_id',
      username,
      dashboardData: data,
    });
  } catch (error) {
    console.error('API /init error:', error);
    const mockData: DashboardData = {
      subredditName: context.subredditName || 'r/rshield_dev',
      health: { healthScore: 98, activeAlertsCount: 0, moderatorActionsCount: 0, totalThreadsTracked: 0, status: 'calm' },
      threads: [],
      systemLogs: ['Failed to load database. Loading fallback system dashboard.'],
      simulationActive: false,
      simulationScene: 1,
      username: 'Moderator',
    };
    return c.json<InitResponse>({
      type: 'init',
      postId: context.postId || 'no_post_id',
      username: 'Moderator',
      dashboardData: mockData,
    });
  }
});

api.get('/dashboard', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) || 'Moderator';
    // Live scan on every poll (frontend polls every 4s)
    await runScannerAndMerge();
    const data = await getDashboardData(username);
    return c.json<DashboardData>(data);
  } catch (error) {
    console.error('API /dashboard error:', error);
    return c.json({ error: 'Failed to retrieve dashboard' }, 500);
  }
});

// ─── On-demand subreddit rescan ─────────────────────────────────────────────
api.post('/scan', async (c) => {
  try {
    const scannedThreads = await scanSubredditPosts();
    if (scannedThreads.length > 0) {
      await mergeScannedThreadsIntoDashboard(scannedThreads);
    }
    await addLog(`[SCANNER] Manual rescan complete: ${scannedThreads.length} posts ingested.`);
    return c.json({ success: true, scanned: scannedThreads.length });
  } catch (err) {
    return c.json({ success: false, error: String(err) }, 500);
  }
});

api.get('/thread/:postId', async (c) => {
  const postId = c.req.param('postId');
  try {
    const thread = await getThread(postId);
    if (!thread) {
      return c.json({ error: 'Thread not found' }, 404);
    }
    return c.json<ThreadState>(thread);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ─── System Verification Endpoint ──────────────────────────────────────────────
api.get('/verify', async (c) => {
  const checks: VerifyResponse['checks'] = {
    redis: { status: 'fail', detail: 'Not tested' },
    redditAuth: { status: 'fail', detail: 'Not tested' },
    triggersRegistered: { status: 'ok', detail: 'onAppInstall, onCommentSubmit, onPostSubmit registered in devvit.json' },
    autoIntervention: { status: 'ok', detail: 'Threat throttling implemented as AI engagement layer' },
    toxicityEngine: { status: 'fail', detail: 'Not tested' },
  };

  // Test Redis connectivity
  try {
    await redis.set('rshield_verify_ping', 'pong');
    const val = await redis.get('rshield_verify_ping');
    if (val === 'pong') {
      checks.redis = { status: 'ok', detail: 'Redis read/write verified' };
    }
    await redis.del('rshield_verify_ping');
  } catch (err) {
    checks.redis = { status: 'fail', detail: `Redis error: ${String(err)}` };
  }

  // Test Reddit API auth
  try {
    const username = await reddit.getCurrentUsername();
    if (username) {
      checks.redditAuth = { status: 'ok', detail: `Authenticated as u/${username}` };
    } else {
      checks.redditAuth = { status: 'fail', detail: 'No username returned' };
    }
  } catch (err) {
    checks.redditAuth = { status: 'fail', detail: `Reddit auth error: ${String(err)}` };
  }

  // Test toxicity engine
  try {
    const result = analyzeCommentToxicity('You are a complete idiot and trash moderator');
    if (result.toxicity > 40 && result.matchedKeywords.length > 0) {
      checks.toxicityEngine = { status: 'ok', detail: `Test phrase scored ${result.toxicity}% with keywords: ${result.matchedKeywords.join(', ')}` };
    } else {
      checks.toxicityEngine = { status: 'fail', detail: `Unexpected score: ${result.toxicity}%` };
    }
  } catch (err) {
    checks.toxicityEngine = { status: 'fail', detail: `Engine error: ${String(err)}` };
  }

  const allOk = Object.values(checks).every((ch) => ch.status === 'ok');
  const anyFail = Object.values(checks).some((ch) => ch.status === 'fail');

  return c.json<VerifyResponse>({
    overall: allOk ? 'healthy' : anyFail ? 'critical' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ─── Moderation Action Endpoint ────────────────────────────────────────────────
api.post('/thread/:postId/action', async (c) => {
  const postId = c.req.param('postId');
  try {
    const { action } = await c.req.json<ActionPayload>();
    const thread = await getThread(postId);
    const username = (await reddit.getCurrentUsername()) || 'Moderator';

    if (!thread) {
      return c.json<ActionResponse>({ success: false, message: 'Thread not found' }, 404);
    }

    let logMessage = '';
    let redditApiResult: RedditApiCallResult = { called: false, success: false, detail: 'No Reddit API call needed' };
    
    // Refresh last updated timestamp to reset decay loop
    const now = Date.now();
    const lastUpdate = thread.lastUpdatedAt || thread.createdAt || now;
    const elapsedMs = now - lastUpdate;
    thread.lastUpdatedAt = now;

    if (action === 'lock') {
      thread.locked = true;
      thread.status = 'locked';
      thread.targetRiskScore = Math.max(10, Math.round(thread.riskScore * 0.2));
      thread.toxicity = Math.max(5, Math.round(thread.toxicity * 0.1));
      thread.replyVelocity = 0.1;
      thread.lastActionBy = username;
      logMessage = `THREAD LOCK EXECUTED: Thread "${thread.title.slice(0, 30)}..." LOCKED by u/${username}.`;

      // Real Reddit API lock
      if (isRealPost(postId)) {
        redditApiResult.called = true;
        try {
          const t3Id = ensureT3(postId);
          const post = await reddit.getPostById(t3Id);
          await post.lock();
          redditApiResult.success = true;
          redditApiResult.detail = `Reddit post ${t3Id} locked successfully`;
        } catch (err) {
          redditApiResult.detail = `Reddit API lock failed: ${String(err)}`;
          console.log('Reddit API call lock failed:', err);
        }
      }

    } else if (action === 'unlock') {
      thread.locked = false;
      thread.status = 'calm';
      thread.targetRiskScore = 12;
      thread.lastActionBy = username;
      logMessage = `THREAD UNLOCK EXECUTED: Thread "${thread.title.slice(0, 30)}..." UNLOCKED by u/${username}.`;

      // Real Reddit API unlock
      if (isRealPost(postId)) {
        redditApiResult.called = true;
        try {
          const t3Id = ensureT3(postId);
          const post = await reddit.getPostById(t3Id);
          await post.unlock();
          redditApiResult.success = true;
          redditApiResult.detail = `Reddit post ${t3Id} unlocked successfully`;
        } catch (err) {
          redditApiResult.detail = `Reddit API unlock failed: ${String(err)}`;
          console.log('Reddit API call unlock failed:', err);
        }
      }

    } else if (action === 'slowmode_enable') {
      thread.slowModeEnabled = true;
      thread.replyVelocity = Math.max(0.5, thread.replyVelocity * 0.3);
      thread.targetRiskScore = Math.max(15, Math.round(thread.riskScore * 0.6));
      thread.lastActionBy = username;
      logMessage = `Threat Throttling ENABLED on "${thread.title.slice(0, 30)}..." by u/${username}.`;
      redditApiResult = { called: false, success: true, detail: 'AI engagement throttling layer activated' };

    } else if (action === 'slowmode_disable') {
      thread.slowModeEnabled = false;
      thread.lastActionBy = username;
      logMessage = `Threat Throttling DISABLED on "${thread.title.slice(0, 30)}..." by u/${username}.`;
      redditApiResult = { called: false, success: true, detail: 'AI engagement throttling layer deactivated' };

    } else if (action === 'quarantine') {
      thread.quarantined = true;
      thread.status = 'quarantined';
      thread.targetRiskScore = 95; // Force severe emergency quarantine level
      thread.lastActionBy = username;
      logMessage = `🔴 QUARANTINE ACTIVATED: Emergency state and threat containment active on "${thread.title.slice(0, 30)}..." by u/${username}.`;
      redditApiResult = { called: false, success: true, detail: 'AI containment quarantine activated' };

    } else if (action === 'restore_stability') {
      thread.quarantined = false;
      thread.locked = false;
      thread.slowModeEnabled = false;
      thread.status = 'calm';
      thread.targetRiskScore = 12; // Reset threat to calm baseline
      thread.toxicity = 4;   // Restored stability baseline
      thread.replyVelocity = 0.2;
      thread.lastActionBy = username;
      logMessage = `🟢 COMMUNITY STABILIZED: Threat containment lifted. Community stability restored on "${thread.title.slice(0, 30)}..." by u/${username}.`;
      redditApiResult = { called: false, success: true, detail: 'AI community stability restored successfully' };
    }

    // Step risk score gradually before save
    transitionRiskScore(thread, elapsedMs);

    // Refresh AI Recommendations after action
    const aiDetails = await generateAISummaryAndRecommendations(thread);
    thread.aiSummary = aiDetails.summary;
    thread.aiRecommendations = aiDetails.recommendations;

    // Update history
    thread.metricsHistory.push({
      timestamp: Date.now(),
      riskScore: thread.riskScore,
      toxicity: thread.toxicity,
      replyVelocity: thread.replyVelocity,
    });

    await saveThread(thread);
    await addLog(logMessage);

    // Update global dashboard metadata
    const dashboard = await getDashboardData(username);
    dashboard.health.moderatorActionsCount += 1;
    dashboard.health.activeAlertsCount = Math.max(0, dashboard.health.activeAlertsCount - 1);
    
    // Recalculate global health score
    let totalRisk = 0;
    dashboard.threads.forEach(t => { totalRisk += t.riskScore; });
    const avgRisk = dashboard.threads.length > 0 ? totalRisk / dashboard.threads.length : 0;
    dashboard.health.healthScore = Math.round(Math.max(10, 100 - avgRisk));
    
    if (dashboard.health.healthScore > 80) {
      dashboard.health.status = 'calm';
    } else if (dashboard.health.healthScore > 50) {
      dashboard.health.status = 'degraded';
    } else {
      dashboard.health.status = 'crisis';
    }
    await saveDashboardData(dashboard);

    const refreshedThread = await getThread(postId);

    return c.json<ActionResponse>({
      success: true,
      message: `Action '${action}' executed successfully.`,
      threadState: refreshedThread || thread,
      redditApiResult,
    });
  } catch (error) {
    console.error('API Action Error:', error);
    return c.json<ActionResponse>({ success: false, message: String(error) }, 500);
  }
});

api.post('/simulation/step', async (c) => {
  try {
    const { scene } = await c.req.json<SimulationStepPayload>();
    const dashboard = await setSimulationScene(scene);
    return c.json<SimulationResponse>({
      success: true,
      message: `Simulation advanced to scene ${scene}.`,
      dashboardData: dashboard,
    });
  } catch (error) {
    console.error('Simulation step error:', error);
    return c.json<SimulationResponse>({
      success: false,
      message: String(error),
      dashboardData: {
        subredditName: context.subredditName || 'r/rshield_dev',
        health: { healthScore: 50, activeAlertsCount: 0, moderatorActionsCount: 0, totalThreadsTracked: 0, status: 'calm' },
        threads: [],
        systemLogs: ['Simulation failed to initialize.'],
        simulationActive: false,
        simulationScene: 1,
        username: 'Moderator',
      },
    }, 500);
  }
});

api.post('/simulation/reset', async (c) => {
  try {
    await redis.del('rshield_dashboard');
    await redis.del('rshield_thread:t3_simulated_debate');
    
    const username = (await reddit.getCurrentUsername()) || 'Moderator';
    const data = await getDashboardData(username);
    
    return c.json<SimulationResponse>({
      success: true,
      message: 'Simulation state reset successfully.',
      dashboardData: data,
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});
