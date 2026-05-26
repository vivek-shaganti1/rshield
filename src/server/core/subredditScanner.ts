import { reddit, redis, context } from '@devvit/web/server';
import type { ThreadState, ThreatHistoryEntry } from '../../shared/api';
import { classifyThreatLevel } from './riskEngine';

// Build an initial threat history from baseRisk
const buildThreatHistory = (baseRisk: number): ThreatHistoryEntry[] => {
  const now = Date.now();
  return [
    {
      timestamp: now - 300000,
      threatLevel: classifyThreatLevel(baseRisk),
      riskScore: baseRisk,
      trigger: 'initial discovery by scanner',
    }
  ];
};

export const scanSubredditPosts = async (): Promise<ThreadState[]> => {
  const activeThreads: ThreadState[] = [];
  try {
    const subredditName = context.subredditName;
    if (!subredditName) {
      console.log('Subreddit name not found in context.');
      return [];
    }

    console.log(`[Subreddit Scanner] Ingesting latest hot posts from r/${subredditName}...`);

    // Fetch the 12 latest posts from the current subreddit using hot posts
    const hotPosts = await reddit.getHotPosts({
      subredditName,
      limit: 12,
    }).all();

    console.log(`[Subreddit Scanner] Found ${hotPosts.length} posts on Reddit.`);

    for (const post of hotPosts) {
      const postId = post.id;
      // Skip dashboard posts themselves or pinned default dashboards to keep feed clean
      if (post.title === 'rshield' || post.title.includes('Dashboard')) {
        continue;
      }

      // Check if thread exists in Redis
      const raw = await redis.get(`rshield_thread:${postId}`);
      let thread: ThreadState;

      if (raw) {
        thread = JSON.parse(raw);
        // Keep active real-time status updated
        thread.locked = post.locked;
        if (thread.locked) {
          thread.status = 'locked';
        }
      } else {
        // Initialize a new ThreadState dynamically for newly discovered post
        const initialRisk = 12; // stable default risk
        thread = {
          id: postId,
          title: post.title,
          author: post.authorName,
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
            { timestamp: Date.now(), riskScore: initialRisk, toxicity: 2, replyVelocity: 0.2 }
          ],
          aiSummary: 'Discovered by Subreddit Scanner. Passive telemetric shield active.',
          aiRecommendations: [
            'Observe initial comments and sentiment velocity.',
            'Maintain background passive monitoring.'
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

        console.log(`[Subreddit Scanner] Registered new real thread: "${post.title.slice(0, 30)}" (ID: ${postId})`);
      }

      // Save or update the thread state in Redis
      await redis.set(`rshield_thread:${postId}`, JSON.stringify(thread));
      activeThreads.push(thread);
    }
  } catch (error) {
    console.error('[Subreddit Scanner] Error scanning posts:', error);
  }

  return activeThreads;
};
