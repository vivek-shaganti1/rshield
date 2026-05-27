<div align="center">

# 🛡️ rShield-ai

### The AI Immune System for Reddit Communities

> **"Real-time AI moderation intelligence. Built for Reddit. Powered by Devvit."**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built with Devvit](https://img.shields.io/badge/Built%20with-Devvit-FF4500?logo=reddit)](https://developers.reddit.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## 🚀 What is rShield-ai?

**rShield-ai** is a production-grade, AI-powered moderation intelligence platform built natively inside Reddit using Devvit.

It continuously monitors subreddit activity, ingests live posts and comments, predicts escalation risk using a proprietary real-time threat engine, and empowers moderators with operational intervention tools — all from a **cinematic moderation command center dashboard**.

Think of rShield-ai as **Reddit Moderation Tools + AI Threat Detection + Community Telemetry + Cybersecurity Operations Center** — combined into a single live moderation operating system.

---

## 🎯 Product Vision

Traditional moderation is **reactive**. Moderators manually inspect reports, read comments, and respond *after* discussions have already collapsed.

**rShield-ai transforms moderation into a live AI defense operation.**

```
Traditional Moderation          rShield-ai
─────────────────────────       ─────────────────────────────────────────
❌ Reports come in               ✅ Continuous subreddit monitoring
❌ Moderator reads thread        ✅ AI predicts escalation before it peaks
❌ Damage already done           ✅ Intervention at earliest warning signs
❌ Manual, one-by-one            ✅ Multi-thread operational awareness
❌ Reactive alerts               ✅ Predictive community defense
```

---

## ✨ Feature Overview

| Feature | Status |
|---|---|
| Live subreddit post ingestion (hot / new / rising) | ✅ Active |
| Real-time comment telemetry | ✅ Active |
| AI threat scoring engine | ✅ Active |
| Escalation probability prediction | ✅ Active |
| Hostility momentum detection | ✅ Active |
| Brigade / cluster detection | ✅ Active |
| Moderator authorization (RBAC) | ✅ Active |
| Thread lock / unlock (Reddit API) | ✅ Active |
| Threat throttling (slow mode) | ✅ Active |
| Containment quarantine mode | ✅ Active |
| Multi-community Redis isolation | ✅ Active |
| Cyberpunk operations center UI | ✅ Active |
| Simulation / cinematic demo deck | ✅ Active |

---

## 🧪 Testing rShield-ai

### ⚡ Option 1 — Direct Dashboard Testing *(Recommended)*

The fastest way to experience rShield-ai. No setup required.

**1.** Open the live Reddit post:

```
https://www.reddit.com/r/rshield_dev/comments/1toftxa/rshield/
```

**2.** Click the **`ACCESS THREAT DASHBOARD`** button.

This launches the live operational dashboard directly inside Reddit. You can:
- Explore live telemetry
- Inspect threat intelligence
- View escalation systems
- Experience the moderation command center UI

**3.** Interact with the thread to generate live data:
- Add comments and replies
- Simulate escalating conversations
- Create hostile engagement patterns

As activity increases, rShield-ai will:

```
Ingest live comment activity
         ↓
Update threat telemetry
         ↓
Track reply velocity
         ↓
Calculate escalation probability
         ↓
Detect hostility progression
         ↓
Refresh operational intelligence in real time
```

> This creates a true **live AI moderation testing environment** — perfect for hackathon judges, reviewers, and community testers.

---

### 🔧 Option 2 — Full Local Development Setup

For developers, contributors, and advanced testers.

#### Requirements

| Requirement | Version |
|---|---|
| Node.js | v22+ |
| Reddit Account | Moderator access |
| Devvit CLI | Latest |

#### Setup Steps

```bash
# 1. Install Devvit CLI
npm install -g devvit

# 2. Clone the repository
git clone https://github.com/vivek-shaganti1/rshield
cd rshield

# 3. Install dependencies
npm install

# 4. Login to Devvit
devvit login

# 5. Initialize Devvit app
npx devvit init --force

# 6. Start playtest (deploys to your test subreddit)
devvit playtest
```

#### Production Upload

```bash
npm run build
npx devvit upload
```

---

## 👮 Moderator Installation Flow

Install rShield-ai into any subreddit you moderate in 3 steps:

```
Step 1 ──────────────────────────────────────────────────────────────
  Visit: https://developers.reddit.com/apps/rshield-ai

Step 2 ──────────────────────────────────────────────────────────────
  Click "Add to Community" → select your subreddit

Step 3 ──────────────────────────────────────────────────────────────
  rShield-ai activates automatically:

  rShield-ai detects subreddit
           ↓
  Live telemetry initializes
           ↓
  Threat engine activates
           ↓
  Operational dashboard becomes available
```

> No manual setup required. Everything is automatic.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────┐
│               rShield-ai Client                │
│   React 19 + TailwindCSS 4 + Vite          │
│                                             │
│   ├── Threat Monitor Feed                   │
│   ├── Live Telemetry Charts                 │
│   ├── AI Prediction Panel                   │
│   └── Intervention Command Deck             │
└───────────────────┬─────────────────────────┘
                    │
                    │  HTTP / Devvit WebView
                    │
┌───────────────────▼─────────────────────────┐
│               rShield-ai Server                │
│   Hono + Node.js Serverless (Devvit)        │
│                                             │
│   ├── /api/init          — Bootstrap        │
│   ├── /api/dashboard     — Live poll        │
│   ├── /api/scan          — Force rescan     │
│   ├── /api/thread/:id    — Thread state     │
│   ├── /api/thread/:id/action — Mod actions  │
│   ├── /api/simulation/*  — Demo deck        │
│   └── /api/verify        — Health check     │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│             Devvit Platform                 │
│                                             │
│   ├── Redis (namespaced per subreddit)      │
│   ├── Reddit API (posts, comments, lock)    │
│   └── Triggers (install, post, comment)     │
└─────────────────────────────────────────────┘
```

---

## 🌐 Multi-Community Architecture

rShield-ai is **subreddit-agnostic**. The same app runs independently in any community with completely isolated state.

```
rshield:{subreddit}:dashboard        — Dashboard state
rshield:{subreddit}:thread:{id}      — Per-thread telemetry
```

```
r/gaming         ─── Redis namespace: rshield:gaming:*
r/technology     ─── Redis namespace: rshield:technology:*
r/startups       ─── Redis namespace: rshield:startups:*
r/movies         ─── Redis namespace: rshield:movies:*
```

Every community gets isolated telemetry, isolated Redis storage, an isolated threat engine, and isolated moderation state.

---

## 🧠 AI Threat Intelligence Engine

The rShield-ai threat engine analyzes every thread across multiple dimensions simultaneously:

| Signal | Description |
|---|---|
| **Toxicity Density** | Toxic comment percentage across thread |
| **Reply Velocity** | Comments per minute (escalation rate) |
| **Hostility Momentum** | Escalation trend acceleration |
| **Conflict Chains** | Repeated hostile reply sequences |
| **Repeat Offender Rate** | Re-engaging hostile users |
| **Keyword Volatility** | Aggressive language spike detection |
| **Brigade Detection** | Coordinated comment cluster analysis |
| **Escalation Probability** | Composite AI risk prediction (0–100%) |

### Threat State Lifecycle

```
  ● stable        →  Community normal. Passive monitoring active.
       ↓
  ◐ elevated      →  Early signals detected. Watchlist updated.
       ↓
  ◑ hostile       →  Active hostility. Intervention recommended.
       ↓
  ◕ critical      →  High risk. Immediate moderator action needed.
       ↓
  ● containment   →  Emergency stabilization mode engaged.
```

Threat scores update live as discussions evolve, with full history preserved per thread.

---

## 🛡️ Moderator Authorization

Every moderation action endpoint is protected by [`modGuard.ts`](src/server/auth/modGuard.ts):

```ts
const isMod = await isCurrentUserModerator();
if (!isMod) return 403 Unauthorized;
```

| Role | Permissions |
|---|---|
| **Moderator** | Full dashboard + all intervention controls |
| **Regular User** | Read-only telemetry view |
| **Anonymous** | Blocked |

---

## 🔒 Real Moderation Actions

rShield-ai performs **real Reddit moderation actions** via Devvit APIs:

| Action | Description | API |
|---|---|---|
| **Lock Thread** | Prevent further comments | `post.lock()` |
| **Unlock Thread** | Restore open discussion | `post.unlock()` |
| **Threat Throttling** | Activate slow mode | Devvit moderation API |
| **Containment Quarantine** | Emergency stabilization mode | Thread state + lock |

---

## ⚡ Event Trigger Architecture

rShield-ai uses native Devvit event triggers for zero-latency ingestion:

```
onAppInstall     →  Initialize subreddit telemetry + create dashboard post
onPostSubmit     →  Ingest new post immediately into threat tracking
onCommentSubmit  →  Update live telemetry, velocity, toxicity analysis
```

Polling occurs every 10–20 seconds using lightweight Devvit-compatible serverless loops for continuous threat assessment.

---

## 🎮 Simulation Mode

rShield-ai includes a **cinematic Simulation Mode** for demos, onboarding, and hackathon presentations:

| Scene | State | Description |
|---|---|---|
| Scene 1 | `stable` | Calm baseline. Community is stable. |
| Scene 2 | `elevated` | Hostility detected. Threat rising. |
| Scene 3 | `hostile` | Escalation in progress. AI engages. |
| Scene 4 | `critical` | Critical threshold. Intervention recommended. |
| Scene 5 | `containment` | Emergency stabilization. Containment active. |

> Simulation telemetry **never** overrides real subreddit data.

---

## 🖥️ Dashboard Features

### Threat Monitor Feed
- Live subreddit posts with usernames, threat %, escalation state, lock status, and telemetry indicators

### Active Risk Profile
- Selected thread with full threat timeline, escalation logs, AI threat classification, and operational status

### Live Telemetry Panel
- Toxicity density, comment velocity, escalation probability, repeat offenders, keyword volatility, hostility progression

### Intervention Console
- Lock threads, unlock threads, throttle escalation, activate containment — directly from the dashboard

---

## 🔧 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TailwindCSS 4, Vite |
| **Backend** | Hono, Node.js v22 (Devvit serverless) |
| **Platform** | Devvit (Reddit Developer Platform) |
| **State** | Redis (via `@devvit/web/server`) |
| **Language** | TypeScript |
| **Reddit API** | `reddit.getPostById`, `post.lock()`, `post.unlock()` |
| **Triggers** | `onAppInstall`, `onCommentSubmit`, `onPostSubmit` |

---

## 🗂️ Project Structure

```
src/
├── client/                       # Frontend (React, runs in iframe)
│   ├── game.html                 # Main dashboard entry point (Expanded View)
│   ├── splash.html               # Inline feed preview (Feed View)
│   ├── game.tsx                  # Main dashboard UI
│   ├── splash.tsx                # Inline preview component
│   └── hooks/
│       └── useDashboard.ts       # State management + API polling
│
├── server/                       # Backend (Devvit serverless)
│   ├── index.ts                  # Hono app entry point
│   ├── auth/
│   │   └── modGuard.ts           # Moderator RBAC authorization
│   ├── core/
│   │   ├── storage.ts            # Redis state management
│   │   ├── riskEngine.ts         # AI threat scoring engine
│   │   ├── subredditScanner.ts   # Live post ingestion (hot/new/rising)
│   │   └── post.ts               # Post utilities
│   └── routes/
│       ├── api.ts                # REST API routes
│       ├── triggers.ts           # Devvit event triggers
│       ├── forms.ts              # Devvit form handlers
│       └── menu.ts               # Moderator menu actions
│
└── shared/
    └── api.ts                    # Shared TypeScript types
```

---

## ⚙️ Environment Variables

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=   # Optional: for future semantic comment analysis
```

> Note: Most configuration is handled automatically by the Devvit platform. No manual API key setup is required for core features.

---

## 📡 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/init` | GET | Public | Bootstrap dashboard |
| `/api/dashboard` | GET | Public | Live dashboard poll |
| `/api/scan` | POST | Moderator | Force subreddit rescan |
| `/api/thread/:id` | GET | Public | Fetch thread state |
| `/api/thread/:id/action` | POST | Moderator | Execute mod action |
| `/api/simulation/step` | POST | Moderator | Advance simulation scene |
| `/api/simulation/reset` | POST | Moderator | Reset simulation |
| `/api/verify` | GET | Public | System health check |

---

## 🧠 Recommended Testing Workflow

```
1. Open Dashboard
       ↓
2. Create subreddit posts
       ↓
3. Add escalating comments
       ↓
4. Observe rising telemetry
       ↓
5. Watch escalation probability climb
       ↓
6. Lock thread (moderator action)
       ↓
7. Observe stabilization
       ↓
8. Unlock thread
       ↓
9. Verify recovery state
```

This demonstrates: live ingestion → real telemetry → AI threat intelligence → operational moderation → real Reddit synchronization.

---

## 🏆 Hackathon Positioning

rShield-ai was built for the **Devvit Hackathon** as a demonstration of what Reddit moderation tooling can become when it's:

- **Real-time** — not batch-processed reports
- **Predictive** — not reactive alerts
- **Operational** — not a settings dashboard
- **Beautiful** — not a utilitarian admin panel
- **Native** — living inside Reddit itself

> *"This feels like a real Reddit internal moderation product."*

---

## 🗺️ Future Roadmap

- [ ] OpenAI-powered semantic comment analysis
- [ ] Cross-subreddit threat intelligence sharing
- [ ] Automated moderation rules engine
- [ ] Historical escalation trend analytics
- [ ] Moderator team collaboration tools
- [ ] Discord / Slack webhook integrations
- [ ] Mobile-optimized dashboard view
- [ ] Advanced behavioral fingerprinting

---

## ❤️ Why rShield-ai Matters

Reddit communities are living systems. Discussions escalate. Brigades emerge. Toxicity spreads.

Moderators today are reactive — they respond *after* damage is done.

**rShield-ai changes moderation from:**

```
Reactive moderation
```

**into:**

```
Predictive AI community defense
```

It sees escalation before it happens. It gives moderators the intelligence and tools to stabilize communities *before* they collapse.

**This is the future of Reddit moderation.**

---

## 🧩 Why Devvit?

Devvit enables rShield-ai to operate **natively inside Reddit** — not as an external tool or browser extension, but as a first-class Reddit experience.

| Benefit | Description |
|---|---|
| **Real moderation APIs** | Direct access to lock, unlock, and manage threads |
| **Subreddit-scoped permissions** | RBAC tied to actual Reddit moderator roles |
| **Reddit identity integration** | No separate auth system needed |
| **Event triggers** | Zero-latency post and comment ingestion |
| **Serverless deployment** | No infrastructure to manage |
| **Native subreddit installation** | One-click install from Reddit's app directory |

> Without Devvit, a system like rShield-ai would not be possible.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Reddit community**

*rShield-ai — Protecting communities before they need protecting.*

</div>
