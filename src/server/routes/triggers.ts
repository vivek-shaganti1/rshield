import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import { getThread, saveThread, addLog, transitionRiskScore } from '../core/storage';
import { analyzeCommentToxicity, calculateRiskScore, generateAISummaryAndRecommendations } from '../core/riskEngine';
import type { ThreadState, CommentData } from '../../shared/api';

export const triggers = new Hono();

type CommentSubmitRequest = {
  author?: { name?: string; id?: string };
  comment?: { id?: string; body?: string; createdAt?: number; postId?: string };
};

type PostSubmitRequest = {
  author?: { name?: string; id?: string };
  post?: { id?: string; title?: string; createdAt?: number };
};

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();
    await addLog(`App installed. Initial dashboard post created (ID: ${post.id}).`);

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/on-post-submit', async (c) => {
  try {
    const payload = await c.req.json<PostSubmitRequest>();
    const postId = payload.post?.id;
    const title = payload.post?.title || 'Untitled Thread';
    const author = payload.author?.name || 'anonymous';
    const createdAt = payload.post?.createdAt || Date.now();

    if (!postId) {
      return c.json<TriggerResponse>({ status: 'error', message: 'No post ID found' }, 400);
    }

    const newThread: ThreadState = {
      id: postId,
      title,
      author,
      createdAt,
      riskScore: 10,
      toxicity: 0,
      replyVelocity: 0,
      reports: 0,
      repeatOffendersCount: 0,
      keywordVolatility: 0,
      status: 'calm',
      recentComments: [],
      metricsHistory: [
        { timestamp: Date.now(), riskScore: 10, toxicity: 0, replyVelocity: 0 }
      ],
      aiSummary: 'New thread submitted. Passive monitoring active.',
      aiRecommendations: ['Observe initial reply engagement.'],
      slowModeEnabled: false,
      locked: false,
      quarantined: false,
      threatLevel: 'stable',
      threatHistory: [
        { timestamp: Date.now(), threatLevel: 'stable', riskScore: 10, trigger: 'thread created' }
      ],
      escalationProbability: 0,
      escalationConfidence: 'LOW',
      escalationFactors: [],
      clusterDetected: false,
      commentClusters: [],
      recoveryState: 'none',
      targetRiskScore: 10,
      lastUpdatedAt: Date.now(),
    };

    await saveThread(newThread);
    await addLog(`New thread monitored: "${title}" by u/${author}.`);

    return c.json<TriggerResponse>({ status: 'success', message: 'Thread created' }, 200);
  } catch (error) {
    console.error('Error in on-post-submit trigger:', error);
    return c.json<TriggerResponse>({ status: 'error', message: String(error) }, 500);
  }
});

triggers.post('/on-comment-submit', async (c) => {
  try {
    const payload = await c.req.json<CommentSubmitRequest>();
    const commentId = payload.comment?.id || `c_${Math.random().toString(36).substr(2, 9)}`;
    const body = payload.comment?.body || '';
    const author = payload.author?.name || 'anonymous';
    const createdAt = payload.comment?.createdAt || Date.now();
    const postId = payload.comment?.postId;

    if (!postId) {
      return c.json<TriggerResponse>({ status: 'error', message: 'No post ID for comment' }, 400);
    }

    let thread = await getThread(postId);
    if (!thread) {
      // Lazy init thread if not tracked yet, try to fetch real post info
      let title = 'Monitored Reddit Discussion';
      let postAuthor = 'unknown';
      let postCreatedAt = Date.now() - 600000;
      let isLocked = false;
      try {
        const t3Id: `t3_${string}` = `t3_${postId.replace(/^t3_/, '')}`;
        const realPost = await reddit.getPostById(t3Id);
        title = realPost.title;
        postAuthor = realPost.authorName ?? 'unknown';
        postCreatedAt = realPost.createdAt.getTime();
        isLocked = realPost.locked;
      } catch (err) {
        console.warn(`[on-comment-submit] Could not fetch post metadata for lazy init: ${String(err)}`);
      }

      thread = {
        id: postId,
        title,
        author: postAuthor,
        createdAt: postCreatedAt,
        riskScore: 10,
        toxicity: 0,
        replyVelocity: 1.0,
        reports: 0,
        repeatOffendersCount: 0,
        keywordVolatility: 0,
        status: isLocked ? 'locked' : 'calm',
        recentComments: [],
        metricsHistory: [{ timestamp: Date.now() - 300000, riskScore: 10, toxicity: 0, replyVelocity: 0 }],
        slowModeEnabled: false,
        locked: isLocked,
        quarantined: false,
        threatLevel: 'stable',
        threatHistory: [
          { timestamp: Date.now() - 300000, threatLevel: 'stable', riskScore: 10, trigger: 'passive monitoring' }
        ],
        escalationProbability: 0,
        escalationConfidence: 'LOW',
        escalationFactors: [],
        clusterDetected: false,
        commentClusters: [],
        recoveryState: 'none',
        targetRiskScore: 10,
        lastUpdatedAt: Date.now(),
      };
    }

    // 1. Toxicity check
    const { toxicity } = analyzeCommentToxicity(body);

    const commentData: CommentData = {
      id: commentId,
      author,
      body,
      createdAt,
      toxicity,
      isRepeatOffender: false,
    };

    // Prepend to comment list (keep max 40)
    thread.recentComments.unshift(commentData);
    if (thread.recentComments.length > 40) {
      thread.recentComments.pop();
    }

    // 2. Identify repeat offenders
    // A repeat offender is someone with >= 2 comments having toxicity > 40
    const authorToxicityCount: Record<string, number> = {};
    let repeatCount = 0;
    thread.recentComments.forEach((comm) => {
      if (comm.toxicity > 40) {
        authorToxicityCount[comm.author] = (authorToxicityCount[comm.author] || 0) + 1;
        const currentCount = authorToxicityCount[comm.author];
        if (currentCount !== undefined && currentCount >= 2) {
          repeatCount++;
          if (comm.author === author) {
            commentData.isRepeatOffender = true;
          }
        }
      }
    });
    thread.repeatOffendersCount = repeatCount;

    // 3. Toxicity velocity & averaging
    const avgToxicity = thread.recentComments.length > 0
      ? thread.recentComments.reduce((acc, comm) => acc + comm.toxicity, 0) / thread.recentComments.length
      : 0;
    thread.toxicity = Math.round(avgToxicity);

    // 4. Calculate reply velocity (comments in the last 5 minutes)
    const fiveMinutesAgo = Date.now() - 300000;
    const recentReplies = thread.recentComments.filter((comm) => comm.createdAt > fiveMinutesAgo);
    thread.replyVelocity = Math.max(1, recentReplies.length * 0.2); // comments per minute

    // 5. Keyword Volatility (percentage of comments containing controversial keywords)
    const volatileComments = thread.recentComments.filter((comm) => {
      const parsed = analyzeCommentToxicity(comm.body);
      return parsed.matchedKeywords.length > 0;
    });
    thread.keywordVolatility = thread.recentComments.length > 0
      ? Math.round((volatileComments.length / thread.recentComments.length) * 100)
      : 0;

    const now = Date.now();
    const lastUpdate = thread.lastUpdatedAt || thread.createdAt || now;
    const elapsedMs = now - lastUpdate;

    // 6. Recalculate Target Risk Score
    const target = calculateRiskScore({
      toxicity: thread.toxicity,
      replyVelocity: thread.replyVelocity * 5, // scaled for weight
      reports: thread.reports,
      repeatOffendersCount: thread.repeatOffendersCount,
      keywordVolatility: thread.keywordVolatility,
    });
    thread.targetRiskScore = target;

    // Transition risk score gradually
    transitionRiskScore(thread, elapsedMs);

    // 7. Status is synchronized automatically in transitionRiskScore unless overridden by lock/quarantine

    // 8. Push history point
    thread.metricsHistory.push({
      timestamp: now,
      riskScore: thread.riskScore,
      toxicity: thread.toxicity,
      replyVelocity: thread.replyVelocity,
    });
    if (thread.metricsHistory.length > 20) {
      thread.metricsHistory.shift();
    }

    // 9. Generate AI details
    const aiDetails = await generateAISummaryAndRecommendations(thread);
    thread.aiSummary = aiDetails.summary;
    thread.aiRecommendations = aiDetails.recommendations;

    // 9.5 Refresh last updated timestamp (Fix 4 decay reset)
    thread.lastUpdatedAt = now;

    // 10. Save thread
    await saveThread(thread);

    // 11. Add log entry (Fix 9 Terminal Logging)
    const logPrefix = `NEW COMMENT DETECTED`;
    const logSuffix = `Threat Score Updated: ${thread.riskScore}% | Escalation State: ${thread.status.toUpperCase()}`;
    if (toxicity > 40) {
      await addLog(`[${logPrefix}] ⚠️ Hostile input u/${author} (Toxicity: ${toxicity}%) | ${logSuffix}`);
    } else {
      await addLog(`[${logPrefix}] Neutral input u/${author} processed | ${logSuffix}`);
    }

    return c.json<TriggerResponse>({ status: 'success', message: 'Comment processed' }, 200);
  } catch (error) {
    console.error('Error in on-comment-submit trigger:', error);
    return c.json<TriggerResponse>({ status: 'error', message: String(error) }, 500);
  }
});
