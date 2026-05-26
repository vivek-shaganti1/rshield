import type { ThreadState, ThreatLevel, CommentCluster } from '../../shared/api';

// ─── Toxicity Analysis ──────────────────────────────────────────────────────
export const analyzeCommentToxicity = (text: string): { toxicity: number; matchedKeywords: string[] } => {
  const lower = text.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  // Granular Toxicity Keyword Map (Fix 1)
  const TOXICITY_MAP: Record<string, number> = {
    'idiot': 50,
    'trash': 45,
    'stupid': 40,
    'hate': 35,
    'biased': 35,
    'kill': 60,
    'clown': 35,
    'garbage': 35,
    'dumb': 30,
    'stfu': 55,
    'censorship': 25,
    'rigged': 25,
    'pathetic': 40,
    'moron': 45,
    'asshole': 55,
    'bitch': 60,
    'fuck': 65,
    'shit': 50,
    'power-tripping': 35,
    'power trip': 35,
    'ban me': 30,
    'troll': 30,
    'brigade': 35,
    'raid': 35,
    'worst': 20,
    'useless': 30,
    'dumbass': 50,
    'censoring': 25,
    'wrong': 15,
    'take': 5,
  };

  // Keyword check
  Object.keys(TOXICITY_MAP).forEach((word) => {
    if (lower.includes(word)) {
      matchedKeywords.push(word);
      score += TOXICITY_MAP[word] || 0;
    }
  });

  // Direct threat / confrontation detection (e.g. "you idiots", "your biased take")
  const directAddressPattern = /\b(you|your|u)\b/i;
  if (matchedKeywords.length > 0 && directAddressPattern.test(lower)) {
    score += 20; // 20 point direct insult escalation
  }

  // Caps check
  const words = text.split(/\s+/);
  const capsWords = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length > 0) {
    score += Math.min(capsWords.length * 10, 30);
  }

  // Punctuation check
  if (text.includes('!!!') || text.includes('???')) {
    score += 15;
  }

  // Cap score between 0 and 100
  const toxicity = Math.max(0, Math.min(100, score));

  return {
    toxicity,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
  };
};

export const calculateRiskScore = (params: {
  toxicity: number;
  replyVelocity: number;
  reports: number;
  repeatOffendersCount: number;
  keywordVolatility: number;
 }): number => {
  // Normalize each metric to 0-100 before weighting (Fix 2)
  const t = Math.min(100, Math.max(0, params.toxicity));
  const v = Math.min(100, Math.max(0, params.replyVelocity * 5)); // Scaled comments per minute (e.g. 20 comments/min = 100%)
  const o = Math.min(100, Math.max(0, params.repeatOffendersCount * 25)); // Scaled repeat offenders (4+ = 100%)
  const kv = Math.min(100, Math.max(0, params.keywordVolatility));

  // Balanced weighted formula: Toxicity (40%), Velocity (20%), Repeat Offenders (20%), Volatility (20%)
  const weighted =
    t * 0.40 +
    v * 0.20 +
    o * 0.20 +
    kv * 0.20;

  return Math.round(Math.min(100, Math.max(0, weighted)));
};

// ─── FIX 1: Threat Level Classification ────────────────────────────────────
export const classifyThreatLevel = (riskScore: number): ThreatLevel => {
  if (riskScore <= 20) return 'stable';
  if (riskScore <= 40) return 'elevated';
  if (riskScore <= 60) return 'hostile';
  if (riskScore <= 80) return 'critical';
  return 'containment';
};

export const THREAT_LEVEL_ORDER: ThreatLevel[] = ['stable', 'elevated', 'hostile', 'critical', 'containment'];

export const isThreatEscalating = (prev: ThreatLevel | undefined, current: ThreatLevel): boolean => {
  if (!prev) return false;
  return THREAT_LEVEL_ORDER.indexOf(current) > THREAT_LEVEL_ORDER.indexOf(prev);
};

// ─── FIX 5: Comment Cluster Detection ──────────────────────────────────────
export const detectCommentClusters = (
  comments: ThreadState['recentComments']
): CommentCluster[] => {
  const clusters: CommentCluster[] = [];
  if (comments.length < 2) return clusters;

  // Chronological order (oldest to newest)
  const interactions = comments
    .map(c => ({ author: c.author, toxicity: c.toxicity, isBrigadeCandidate: c.isBrigadeCandidate }))
    .reverse();

  // 1. Alternating back-and-forth conversational exchanges
  const pairExchanges: Record<string, number> = {};
  for (let i = 0; i < interactions.length - 1; i++) {
    const current = interactions[i];
    const next = interactions[i + 1];
    if (current && next && current.author !== next.author) {
      // If either comment has elevated toxicity (> 30 toxicity)
      if (current.toxicity > 30 || next.toxicity > 30) {
        const pairKey = [current.author, next.author].sort().join(' ⟷ ');
        pairExchanges[pairKey] = (pairExchanges[pairKey] || 0) + 1;
      }
    }
  }

  // Filter for pairs with 2 or more exchanges (back-and-forth)
  Object.entries(pairExchanges).forEach(([pairStr, count]) => {
    if (count >= 2) {
      clusters.push({
        participants: pairStr.split(' ⟷ '),
        hostileExchanges: count,
        clusterType: 'flamewar',
      });
    }
  });

  // 2. Coordinated brigade candidates
  const brigaders = comments
    .filter(c => c.isBrigadeCandidate)
    .map(c => c.author);
  const uniqueBrigaders = Array.from(new Set(brigaders));
  if (uniqueBrigaders.length >= 2) {
    clusters.push({
      participants: uniqueBrigaders,
      hostileExchanges: brigaders.length,
      clusterType: 'brigade',
    });
  }

  // 3. Repeat conflict participants
  const hostileUsers = comments.filter(c => c.toxicity > 40).map(c => c.author);
  const userFreq: Record<string, number> = {};
  hostileUsers.forEach(u => { userFreq[u] = (userFreq[u] || 0) + 1; });
  const repeatConflictors = Object.entries(userFreq)
    .filter(([, count]) => count >= 2)
    .map(([author]) => author);

  const repeatOffenders = comments.filter(c => c.isRepeatOffender).map(c => c.author);

  if (repeatOffenders.length >= 1 && repeatConflictors.length >= 1) {
    const combined = Array.from(new Set([...repeatOffenders, ...repeatConflictors]));
    clusters.push({
      participants: combined,
      hostileExchanges: combined.length,
      clusterType: 'repeat_conflict',
    });
  }

  return clusters;
};

// ─── FIX 8: Escalation Probability Engine ──────────────────────────────────
export const calculateEscalationProbability = (thread: ThreadState): {
  probability: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
} => {
  let probability = 0;
  const factors: string[] = [];

  // Factor 1: Current risk trajectory (from history)
  const history = thread.metricsHistory || [];
  if (history.length >= 3) {
    const recent = history.slice(-3);
    const trend = (recent[2]?.riskScore ?? 0) - (recent[0]?.riskScore ?? 0);
    if (trend > 20) {
      probability += 35;
      factors.push(`${trend}pt risk surge in last 3 data points`);
    } else if (trend > 10) {
      probability += 18;
      factors.push(`moderate ${trend}pt upward risk trend`);
    } else if (trend < -10) {
      probability -= 20;
      factors.push('risk trend declining — de-escalating');
    }
  }

  // Factor 2: High reply velocity
  if (thread.replyVelocity > 20) {
    probability += 30;
    factors.push(`abnormal engagement velocity (${thread.replyVelocity.toFixed(1)}/min)`);
  } else if (thread.replyVelocity > 10) {
    probability += 15;
    factors.push(`elevated reply velocity (${thread.replyVelocity.toFixed(1)}/min)`);
  }

  // Factor 3: Repeat offenders
  if (thread.repeatOffendersCount >= 3) {
    probability += 25;
    factors.push(`${thread.repeatOffendersCount} repeat offenders active`);
  } else if (thread.repeatOffendersCount >= 1) {
    probability += 12;
    factors.push(`${thread.repeatOffendersCount} repeat offender flagged`);
  }

  // Factor 4: High keyword volatility
  if (thread.keywordVolatility > 40) {
    probability += 20;
    factors.push('extreme keyword volatility detected');
  } else if (thread.keywordVolatility > 20) {
    probability += 10;
    factors.push('elevated keyword volatility');
  }

  // Factor 5: Brigade/cluster detection
  if (thread.clusterDetected) {
    probability += 25;
    factors.push('coordinated conflict cluster active');
  }

  // Factor 6: Reports
  if (thread.reports > 10) {
    probability += 15;
    factors.push(`${thread.reports} user reports logged`);
  }

  // Factor 7: Current threat level weight
  const threatWeight: Record<string, number> = {
    stable: -10,
    elevated: 5,
    hostile: 15,
    critical: 25,
    containment: 0,
  };
  probability += threatWeight[thread.threatLevel || 'stable'] ?? 0;

  // Clamp
  probability = Math.max(0, Math.min(100, Math.round(probability)));

  // Confidence based on factor count
  const confidence: 'LOW' | 'MEDIUM' | 'HIGH' =
    factors.length >= 4 ? 'HIGH' : factors.length >= 2 ? 'MEDIUM' : 'LOW';

  return { probability, confidence, factors };
};

export const generateAISummaryAndRecommendations = async (
  thread: ThreadState,
  apiKey?: string
): Promise<{ summary: string; recommendations: string[] }> => {
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are rShield, the cybersecurity-themed predictive moderator system for Reddit. You analyze subreddits to detect flamewars, toxicity escalation, coordinated brigading, and moderator stress. Provide your analysis in structured JSON with two keys: "summary" (string, max 3 sentences explaining the danger triggers with specific numbers and WHY behavior changed) and "recommendations" (array of 3 specific actions, e.g. "Lock thread", "Enable 60s slow mode"). Keep it sounding futuristic, technical, and highly precise.',
            },
            {
              role: 'user',
              content: `Analyze this thread:
Title: "${thread.title}"
Risk Score: ${thread.riskScore}%
Threat Level: ${thread.threatLevel?.toUpperCase() || 'STABLE'}
Escalation Probability: ${thread.escalationProbability || 0}% (${thread.escalationConfidence || 'LOW'} confidence)
Toxicity: ${thread.toxicity}%
Reply Velocity: ${thread.replyVelocity} comments/min
Reports: ${thread.reports}
Repeat Offenders: ${thread.repeatOffendersCount}
Keyword Volatility: ${thread.keywordVolatility}%
Cluster Detected: ${thread.clusterDetected ? 'YES' : 'NO'}
Escalation Factors: ${(thread.escalationFactors || []).join('; ')}
Comments analyzed:
${thread.recentComments.slice(0, 5).map((c) => `- u/${c.author}: "${c.body}" (Toxicity: ${c.toxicity}%)`).join('\n')}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = JSON.parse(json.choices[0].message.content);
        if (content.summary && Array.isArray(content.recommendations)) {
          return {
            summary: content.summary,
            recommendations: content.recommendations,
          };
        }
      }
    } catch (e) {
      console.error('OpenAI API call failed, falling back to heuristic engine:', e);
    }
  }

  // Fallback heuristic summary engine (polished, contextual responses)
  const lastHostileComment = thread.recentComments.find((c) => c.toxicity > 40);
  const triggerUser = lastHostileComment ? `u/${lastHostileComment.author}` : 'repeat offenders';

  const allKeywords: string[] = [];
  thread.recentComments.forEach(c => {
    const { matchedKeywords } = analyzeCommentToxicity(c.body);
    allKeywords.push(...matchedKeywords);
  });
  const uniqueKeywords = Array.from(new Set(allKeywords)).slice(0, 3);
  const kwString = uniqueKeywords.length > 0 ? uniqueKeywords.join(', ') : 'mod, trash, censorship';

  const escalationFactors = thread.escalationFactors || [];
  const factorBullets = escalationFactors.slice(0, 3).map(f => `• ${f}`).join(' ');
  const clusterNote = thread.clusterDetected
    ? ` Coordinated conflict cluster detected with ${thread.commentClusters?.[0]?.participants?.length || 2} repeat participants.`
    : '';

  const threatLabel = (thread.threatLevel || 'stable').toUpperCase();
  const probText = thread.escalationProbability !== undefined
    ? ` Escalation probability: ${thread.escalationProbability}% (${thread.escalationConfidence || 'LOW'} confidence).`
    : '';

  // FIX 10: Dynamic recommendations based on threat level
  const getDynamicRecommendations = (level: string): string[] => {
    switch (level) {
      case 'stable':
        return [
          'Maintain routine background passive monitoring.',
          'Ensure automatic filtering remains active.',
          'No immediate moderator intervention required.',
        ];
      case 'elevated':
        return [
          'Monitor thread velocity — watch for acceleration.',
          'Pre-emptively review flagged users\' comment history.',
          'Stand by for throttling activation if escalation continues.',
        ];
      case 'hostile':
        return [
          'Activate Threat Throttling to suppress heated comment bursts.',
          'Manually inspect recent replies by flagged repeat offenders.',
          'Pre-emptively flag thread for priority review if velocity rises.',
        ];
      case 'critical':
        return [
          'Execute Thread Lock immediately to halt toxicity propagation.',
          'Issue warning sticky comment and auto-delete comments with >60% toxicity.',
          'Quarantine active brigaders and repeat violators.',
        ];
      case 'containment':
        return [
          '☣ CONTAINMENT ACTIVE — Lock thread immediately.',
          'Restrict commenting to users with established subreddit tenure.',
          'Activate Recovery Monitoring — track stabilization progress.',
        ];
      default:
        return ['Monitor thread activity.', 'No action required.', 'Continue passive surveillance.'];
    }
  };

  if (thread.riskScore < 35) {
    const throttleMsg = thread.slowModeEnabled
      ? ' Engagement velocity successfully suppressed via threat throttling. Escalation probability reduced.'
      : '';
    return {
      summary: `Thread operating within STABLE behavioral baselines. Threat Level: ${threatLabel}.${probText} User engagement is constructive with a positive sentiment ratio. No anomalies detected.${throttleMsg}`,
      recommendations: getDynamicRecommendations('stable'),
    };
  } else if (thread.riskScore < 50) {
    return {
      summary: `ELEVATED threat signature detected in "${thread.title}". Threat Level: ${threatLabel}.${probText} Escalation vectors triggered by ${triggerUser} using sensitive keywords (${kwString}). Reply velocity starting to accelerate.${factorBullets ? ` Escalation accelerated due to: ${factorBullets}.` : ''}`,
      recommendations: getDynamicRecommendations('elevated'),
    };
  } else if (thread.riskScore < 65) {
    return {
      summary: `HOSTILE engagement pattern confirmed in "${thread.title}". Threat Level: ${threatLabel}.${probText}${clusterNote} Severe back-and-forth arguments detected. Keyword volatility: ${thread.keywordVolatility}%.${factorBullets ? ` Escalation driven by: ${factorBullets}.` : ''}`,
      recommendations: getDynamicRecommendations('hostile'),
    };
  } else if (thread.status === 'brigaded' || thread.reports > 15 || thread.replyVelocity > 35) {
    return {
      summary: `CRITICAL BRIGADE ALERT: Coordinated swarm behavior identified in "${thread.title}". Threat Level: ${threatLabel}.${probText} Synchronized reply spikes (${thread.replyVelocity.toFixed(1)}/min) from non-regular accounts. Hostile vocabulary highly concentrated on "${kwString}".${clusterNote}`,
      recommendations: getDynamicRecommendations('critical'),
    };
  } else if (thread.riskScore >= 80 || thread.threatLevel === 'containment') {
    return {
      summary: `☣ CONTAINMENT THRESHOLD BREACHED: "${thread.title}" has exceeded critical limits. Threat Level: ${threatLabel}.${probText} Maximum toxicity breach (${thread.toxicity}%). ${factorBullets ? `Crisis triggered by: ${factorBullets}.` : 'Immediate containment required.'}${clusterNote}`,
      recommendations: getDynamicRecommendations('containment'),
    };
  } else {
    const throttleMsg = thread.slowModeEnabled
      ? ' Threat throttling is active — engagement velocity suppression in effect.'
      : '';
    return {
      summary: `CRITICAL THREAD CRISIS: High toxicity threshold crossed (Toxicity: ${thread.toxicity}%) in "${thread.title}". Threat Level: ${threatLabel}.${probText} Severe argument escalation detected. ${factorBullets ? `Escalation factors: ${factorBullets}.` : ''}${throttleMsg}`,
      recommendations: getDynamicRecommendations('critical'),
    };
  }
};
