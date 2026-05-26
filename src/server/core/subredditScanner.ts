import { reddit, redis, context } from '@devvit/web/server';
import type { ThreadState, ThreatHistoryEntry } from '../../shared/api';
import { classifyThreatLevel } from './riskEngine';

// System post titles that should never be tracked
const SYSTEM_POST_PATTERNS = ['rshield', 'dashboard'];

const isSystemPost = (title: string): boolean => {
  const lower = title.toLowerCase();
  return SYSTEM_POST_PATTERNS.some((p) => lower.includes(p));
};

// Build an initial threat history entry for a newly discovered post
const buildThreatHistory = (baseRisk: number): ThreatHistoryEntry[] => {
  return [
    {
      timestamp: Date.now() - 300000,
      threatLevel: classifyThreatLevel(baseRisk),
      riskScore: baseRisk,
      trigger: 'initial discovery by scanner',
    },
  ];
};

type RawPost = {
  id: string;
  title: string;
  authorName?: string;
  createdAt: Date;
  locked: boolean;
};

export const scanSubredditPosts = async (): Promise<ThreadState[]> => {
  const activeThreads: ThreadState[] = [];

  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      console.log('[Scanner] No subreddit context found.');
      return [];
    }

    console.log(`[Scanner] Scanning r/${subredditName} (hot + new)...`);

    // Deduplicate across hot + new feeds using a Map keyed by post ID
    const postMap = new Map<string, RawPost>();

    // Fetch hot posts (primary feed)
    try {
      const hotPosts = await reddit.getHotPosts({ subredditName, limit: 100 }).all();
      for (const p of hotPosts) {
        postMap.set(p.id, {
          id: p.id,
          title: p.title,
          authorName: p.authorName,
          createdAt: p.createdAt,
          locked: p.locked,
        });
      }
      console.log(`[Scanner] Hot feed: ${hotPosts.length} posts.`);
    } catch (e) {
      console.warn('[Scanner] Hot posts fetch failed (non-fatal):', String(e));
    }

    // Fetch new posts (catch recently-created posts not yet on hot)
    try {
      const newPosts = await reddit.getNewPosts({ subredditName, limit: 100 }).all();
      for (const p of newPosts) {
        if (!postMap.has(p.id)) {
          postMap.set(p.id, {
            id: p.id,
            title: p.title,
            authorName: p.authorName,
            createdAt: p.createdAt,
            locked: p.locked,
          });
        }
      }
      console.log(`[Scanner] New feed contributed unique posts. Total so far: ${postMap.size}`);
    } catch (e) {
      console.warn('[Scanner] New posts fetch failed (non-fatal):', String(e));
    }

    // Fetch rising posts
    try {
      const risingPosts = await reddit.getRisingPosts({ subredditName, limit: 100 }).all();
      for (const p of risingPosts) {
        if (!postMap.has(p.id)) {
          postMap.set(p.id, {
            id: p.id,
            title: p.title,
            authorName: p.authorName,
            createdAt: p.createdAt,
            locked: p.locked,
          });
        }
      }
      console.log(`[Scanner] Rising feed contributed unique posts. Final total: ${postMap.size}`);
    } catch (e) {
      console.warn('[Scanner] Rising posts fetch failed (non-fatal):', String(e));
    }

    console.log(`[Scanner] Processing ${postMap.size} unique posts...`);

    for (const post of postMap.values()) {
      const postId = post.id;

      // Skip rShield system/dashboard posts
      if (isSystemPost(post.title)) {
        continue;
      }

      const raw = await redis.get(`rshield:${subredditName}:thread:${postId}`);
      let thread: ThreadState;

      if (raw) {
        // Thread already tracked — sync live Reddit state into existing telemetry
        thread = JSON.parse(raw) as ThreadState;

        const wasLocked = thread.locked;
        thread.locked = post.locked;

        if (post.locked && !wasLocked) {
          // Thread just got locked on Reddit
          thread.status = 'locked';
          thread.targetRiskScore = Math.max(10, Math.round((thread.targetRiskScore ?? thread.riskScore) * 0.3));
          thread.threatHistory = thread.threatHistory || [];
          thread.threatHistory.push({
            timestamp: Date.now(),
            threatLevel: classifyThreatLevel(thread.riskScore),
            riskScore: thread.riskScore,
            trigger: 'Thread locked on Reddit',
          });
          if (thread.threatHistory.length > 20) thread.threatHistory.shift();
        } else if (!post.locked && wasLocked && thread.status === 'locked') {
          // Thread was unlocked on Reddit
          thread.status = 'calm';
          thread.threatHistory = thread.threatHistory || [];
          thread.threatHistory.push({
            timestamp: Date.now(),
            threatLevel: 'stable',
            riskScore: thread.riskScore,
            trigger: 'Thread unlocked on Reddit',
          });
          if (thread.threatHistory.length > 20) thread.threatHistory.shift();
        }

        thread.lastUpdatedAt = Date.now();
      } else {
        // Newly discovered post — create initial thread state
        const initialRisk = 12;
        thread = {
          id: postId,
          title: post.title,
          author: post.authorName ?? 'unknown',
          createdAt: post.createdAt.getTime(),
          riskScore: initialRisk,
          toxicity: 2,
          replyVelocity: 0.2,
          reports: 0,
          repeatOffendersCount: 0,
          keywordVolatility: 0,
          status: post.locked ? 'locked' : 'calm',
          recentComments: [],
          metricsHistory: [
            { timestamp: Date.now(), riskScore: initialRisk, toxicity: 2, replyVelocity: 0.2 },
          ],
          aiSummary: 'Discovered by rShield Scanner. Passive telemetric shield active.',
          aiRecommendations: [
            'Observe initial comments and sentiment velocity.',
            'Maintain background passive monitoring.',
          ],
          slowModeEnabled: false,
          locked: post.locked,
          quarantined: false,
          threatLevel: 'stable',
          threatHistory: buildThreatHistory(initialRisk),
          escalationProbability: 3,
          escalationConfidence: 'LOW',
          escalationFactors: [],
          clusterDetected: false,
          commentClusters: [],
          recoveryState: 'none',
          targetRiskScore: initialRisk,
          lastUpdatedAt: Date.now(),
        };

        console.log(
          `[Scanner] Registered new thread: "${post.title.slice(0, 45)}" (ID: ${postId})`
        );
      }

      // Persist updated/new thread state
      await redis.set(`rshield:${subredditName}:thread:${postId}`, JSON.stringify(thread));
      activeThreads.push(thread);
    }

    console.log(`[Scanner] Done — ${activeThreads.length} threads tracked.`);
  } catch (error) {
    console.error('[Scanner] Fatal error during scan:', error);
  }

  return activeThreads;
};
