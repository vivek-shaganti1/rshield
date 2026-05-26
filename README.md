# rShield — The AI Immune System for Reddit Communities

> **"Real-time AI moderation intelligence. Built for Reddit. Powered by Devvit."**

---

## 🚀 What is rShield?

**rShield** is a production-grade, AI-powered moderation intelligence platform built as a Devvit web application for Reddit.

It continuously monitors subreddit activity, ingests live posts and comments, predicts escalation risk using a proprietary threat engine, and empowers moderators with real-time intervention tools — all from a cinematic operations center dashboard.

---

## 🎯 Product Vision

rShield transforms moderating a subreddit into a **live AI defense operation**:

- 📡 **Live ingestion** of all subreddit posts (hot, new, rising)
- 🧠 **AI threat prediction** — escalation probability, hostility velocity, reply clustering
- 🔒 **Real moderation actions** — lock, unlock, quarantine, throttle
- 📊 **Live telemetry** — risk score timelines, toxicity tracking, comment intelligence
- 🛡️ **Moderator authorization** — RBAC enforcement at every action endpoint
- 🌐 **Multi-community architecture** — isolated Redis namespaces per subreddit

---

## ✨ Feature Overview

| Feature | Status |
|---|---|
| Live subreddit post ingestion (hot/new/rising) | ✅ Active |
| Real-time comment telemetry | ✅ Active |
| AI threat scoring engine | ✅ Active |
| Escalation probability prediction | ✅ Active |
| Moderator authorization (RBAC) | ✅ Active |
| Thread lock / unlock (Reddit API) | ✅ Active |
| Threat throttling (slow mode) | ✅ Active |
| Containment quarantine mode | ✅ Active |
| Multi-community Redis isolation | ✅ Active |
| Cyberpunk operations center UI | ✅ Active |
| Simulation / demo deck | ✅ Active |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│               rShield Client                │
│   React 19 + TailwindCSS 4 + Vite          │
│   ├── Threat Monitor Feed                   │
│   ├── Live Telemetry Charts                 │
│   ├── AI Prediction Panel                   │
│   └── Intervention Command Deck            │
└───────────────────┬─────────────────────────┘
                    │ HTTP (Devvit Web)
┌───────────────────▼─────────────────────────┐
│               rShield Server                │
│   Hono + Node.js Serverless (Devvit)        │
│   ├── /api/init        — Bootstrap          │
│   ├── /api/dashboard   — Live poll          │
│   ├── /api/scan        — Force rescan       │
│   ├── /api/thread/:id  — Thread state       │
│   ├── /api/thread/:id/action — Mod actions  │
│   ├── /api/simulation/* — Demo deck         │
│   └── /api/verify      — Health check       │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│             Devvit Platform                 │
│   ├── Redis (namespaced per subreddit)      │
│   ├── Reddit API (posts, comments, lock)    │
│   └── Triggers (install, post, comment)     │
└─────────────────────────────────────────────┘
```

---

## 🔐 Multi-Community Architecture

All Redis state is **isolated per subreddit**:

```
rshield:{subreddit}:dashboard      — Dashboard state
rshield:{subreddit}:thread:{id}    — Per-thread telemetry
```

The **same app** can be installed in r/gaming, r/technology, r/startups, or any subreddit — each with completely independent data.

---

## 🧠 AI Threat Engine

The rShield threat engine analyzes every thread across multiple dimensions:

| Signal | Description |
|---|---|
| **Toxicity Score** | Keyword volatility analysis on comments |
| **Reply Velocity** | Comment arrival rate (replies/min) |
| **Hostility Momentum** | Escalation trend detection |
| **Repeat Offender Rate** | Author re-engagement frequency |
| **Brigade Candidate Detection** | Coordinated comment cluster analysis |
| **Escalation Probability** | ML-style composite risk prediction |
| **Threat Level** | `stable → elevated → hostile → critical → containment` |

---

## 🛡️ Moderator Authorization

Every moderation action endpoint is protected by `modGuard.ts`:

```ts
const isMod = await isCurrentUserModerator();
if (!isMod) return 403 Unauthorized;
```

- **Moderators**: Full dashboard + all intervention controls
- **Regular users**: Read-only telemetry view
- **Anonymous**: Blocked

---

## 🔧 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TailwindCSS 4, Vite |
| **Backend** | Hono, Node.js v22 (Devvit serverless) |
| **Platform** | Devvit (Reddit Developer Platform) |
| **State** | Redis (via `@devvit/web/server`) |
| **Reddit API** | `reddit.getPostById`, `post.lock()`, `post.unlock()` |
| **Triggers** | `onAppInstall`, `onCommentSubmit`, `onPostSubmit` |

---

## 📦 Installation Guide

### Prerequisites

- Node.js v22+
- Devvit CLI: `npx devvit --version`
- A Reddit moderator account

### Local Development

```bash
git clone https://github.com/YOUR_USERNAME/rshield.git
cd rshield
npm install
npm run dev
```

### Playtest on Reddit

```bash
npx devvit playtest
```

This uploads a development build to your test subreddit (configured in `devvit.json → dev.subreddit`).

### Production Upload

```bash
npm run build
npx devvit upload
```

---

## ⚙️ Environment Variables

See [.env.example](.env.example) for a full list of environment variables.

```bash
cp .env.example .env
```

> Note: Most configuration is handled automatically by the Devvit platform. No manual API key setup is required for core features.

---

## 🗂️ Project Structure

```
src/
├── client/                  # Frontend (React, runs in iframe)
│   ├── game.tsx             # Main dashboard UI
│   ├── splash.tsx           # Inline feed preview
│   └── hooks/
│       └── useDashboard.ts  # State management + API polling
├── server/                  # Backend (Devvit serverless)
│   ├── index.ts             # Hono app entry point
│   ├── auth/
│   │   └── modGuard.ts      # Moderator authorization
│   ├── core/
│   │   ├── storage.ts       # Redis state management
│   │   ├── riskEngine.ts    # AI threat scoring
│   │   └── subredditScanner.ts  # Live post ingestion
│   └── routes/
│       ├── api.ts           # REST API routes
│       ├── triggers.ts      # Devvit event triggers
│       └── menu.ts          # Moderator menu actions
└── shared/
    └── api.ts               # Shared TypeScript types
```

---

## 🎬 Simulation Deck

rShield includes a cinematic **Simulation Mode** for demos and onboarding:

- **Scene 1** — Calm baseline. Community is stable.
- **Scene 2** — Hostility detected. Threat rising.
- **Scene 3** — Escalation in progress. AI engages.
- **Scene 4** — Critical threshold. Intervention recommended.
- **Scene 5** — Containment active. Emergency stabilization.

> Simulation never overwrites real live telemetry.

---

## 📡 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/init` | GET | Public | Bootstrap dashboard |
| `/api/dashboard` | GET | Public | Live dashboard poll |
| `/api/scan` | POST | Moderator | Force subreddit rescan |
| `/api/thread/:id` | GET | Public | Thread state |
| `/api/thread/:id/action` | POST | Moderator | Execute mod action |
| `/api/simulation/step` | POST | Moderator | Advance simulation |
| `/api/simulation/reset` | POST | Moderator | Reset simulation |
| `/api/verify` | GET | Public | System health check |

---

## 🗺️ Future Roadmap

- [ ] OpenAI-powered comment analysis
- [ ] Cross-subreddit threat intelligence sharing
- [ ] Automated moderation rules engine
- [ ] Historical escalation trend reports
- [ ] Moderator team collaboration tools
- [ ] Discord/Slack webhook integrations
- [ ] Mobile-optimized dashboard view

---

## 🏆 Hackathon Positioning

rShield was built for the **Devvit Hackathon** as a demonstration of what Reddit moderation tooling can become when it's:

- **Real-time** — not batch-processed reports
- **Predictive** — not reactive alerts
- **Operational** — not a settings dashboard
- **Beautiful** — not a utilitarian admin panel

> *"This feels like a real Reddit internal moderation product."*

---

## ❤️ Why rShield Matters

Reddit communities are living systems. Discussions escalate. Brigades happen. Toxicity spreads.

Moderators today are reactive — they respond *after* damage is done.

**rShield makes moderation proactive.** It sees escalation before it happens. It gives moderators the intelligence and tools to stabilize communities *before* they collapse.

This is the future of Reddit moderation.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
