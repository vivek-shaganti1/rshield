# rShield — The AI Immune System for Reddit Communities

> **"Real-time AI moderation intelligence. Built for Reddit. Powered by Devvit."**

---

# 🚀 What is rShield?

rShield is a production-grade AI-powered moderation intelligence platform built for Reddit using Devvit.

It continuously monitors subreddit activity, ingests live posts and comments, predicts escalation risk using a real-time threat engine, and empowers moderators with operational intervention tools from a cinematic moderation command center dashboard.

Think of rShield as:

- Reddit Moderation Tools
- AI Threat Detection
- Community Telemetry
- Cybersecurity Operations Center

combined into a single live moderation operating system.

---

# 🎯 Product Vision

Traditional moderation is reactive.

Moderators manually:
- inspect reports
- read comments
- respond after discussions collapse

rShield transforms moderation into a:

# LIVE AI DEFENSE OPERATION

It continuously:
- monitors subreddit activity
- predicts escalation
- detects hostile engagement
- tracks behavioral anomalies
- assists moderators with intervention
- stabilizes communities before threads spiral out of control

---

# 🧪 Testing rShield

rShield can be tested in TWO ways:

---

# OPTION 1 — Direct Dashboard Testing (Recommended)

This is the fastest way to experience rShield.

Open the live Reddit post:

```text
https://www.reddit.com/r/rshield_dev/comments/1toftxa/rshield/
```

Then click:

```text
ACCESS THREAT DASHBOARD
```

This launches the live operational dashboard directly inside Reddit.

You can:
- explore telemetry
- inspect threat intelligence
- view escalation systems
- experience the moderation command center UI
- test the live dashboard experience

---

# 💬 Interactive Live Testing

Testing can ALSO be performed directly from the Reddit thread itself.

Users can:
- add comments
- reply to discussions
- simulate escalating conversations
- create hostile engagement patterns
- trigger telemetry updates

As comments increase, rShield will:
- ingest live comment activity
- update threat telemetry
- track reply velocity
- calculate escalation probability
- detect hostility progression
- refresh operational intelligence in real time

This allows reviewers and judges to:
- interact with the system naturally
- observe live telemetry evolution
- test moderation workflows directly on Reddit

This creates a true:

# live AI moderation testing environment.

---

This is the recommended testing flow for:
- hackathon judges
- reviewers
- moderators
- community testers

---

# OPTION 2 — Full Local Development Setup

Recommended for:
- developers
- contributors
- advanced testers
- Devvit experimentation

---

## Requirements

- Node.js v22+
- Reddit account
- Moderator access to a subreddit
- Devvit CLI

---

## Install Devvit CLI

```bash
npm install -g devvit
```

---

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/rshield.git

cd rshield
```

---

## Install Dependencies

```bash
npm install
```

---

## Login to Devvit

```bash
devvit login
```

---

## Initialize Devvit App

```bash
npx devvit init --force
```

---

## Start Playtest

```bash
devvit playtest
```

This creates:
- temporary Reddit deployment
- live subreddit testing environment
- operational dashboard

---

# 👮 Moderator Installation Flow

Moderators can install rShield into their own subreddit.

---

## Step 1 — Open App Page

Visit:

```text
https://developers.reddit.com/apps/rshield-ai
```

---

## Step 2 — Click "Add to Community"

Select a subreddit where you are a moderator.

---

## Step 3 — rShield Activates Automatically

Once installed:

```text
rShield detects subreddit
        ↓
Live telemetry initializes
        ↓
Threat engine activates
        ↓
Operational dashboard becomes available
```

No manual setup required.

---

# 🔐 Moderator Authorization

rShield automatically validates moderator permissions using Reddit + Devvit APIs.

Only moderators can:
- lock threads
- unlock discussions
- activate throttling
- trigger containment

Regular users receive:
- read-only telemetry access

---

# 🧠 Recommended Testing Workflow

1. Open dashboard
2. Create subreddit posts
3. Add comments
4. Trigger escalating discussion
5. Observe threat telemetry
6. Watch escalation probability rise
7. Lock/unlock threads
8. Observe stabilization recovery

This demonstrates:
- live ingestion
- real telemetry
- AI threat intelligence
- operational moderation systems
- real Reddit synchronization

---

# 🧠 Core Capabilities

## 📡 Live Subreddit Monitoring

rShield continuously scans:
- hot posts
- new posts
- rising discussions
- live comment streams

using Devvit Reddit APIs.

The ingestion engine:
- syncs telemetry
- tracks engagement velocity
- updates thread states
- hydrates historical telemetry
- prevents duplicate ingestion

Polling occurs every 10–20 seconds using lightweight Devvit-compatible serverless loops.

---

## 🧠 AI Threat Intelligence

The threat engine dynamically computes:

| Signal | Description |
|---|---|
| Toxicity Density | Toxic comment percentage |
| Reply Velocity | Comments/minute |
| Hostility Momentum | Escalation acceleration |
| Conflict Chains | Repeated hostile exchanges |
| Repeat Offender Rate | Re-engaging hostile users |
| Keyword Volatility | Aggressive language spikes |
| Escalation Probability | Composite AI risk prediction |

Threat states evolve through:

```text
stable
↓
elevated
↓
hostile
↓
critical
↓
containment
```

Threat scores update live as discussions evolve.

---

# 🛡️ Real Moderation Actions

rShield performs REAL Reddit moderation actions.

Moderators can:

| Action | Description |
|---|---|
| Lock Thread | Prevent further comments |
| Unlock Thread | Restore discussion |
| Threat Throttling | Slow escalation |
| Containment Quarantine | Emergency stabilization mode |

All actions synchronize directly with Reddit using Devvit APIs.

---

# 🌐 Multi-Community Architecture

rShield is subreddit-agnostic.

The same app can run independently inside:
- r/gaming
- r/technology
- r/startups
- r/movies
- any moderator-owned subreddit

Every community gets:
- isolated telemetry
- isolated Redis storage
- isolated threat engine
- isolated moderation state

Redis namespaces:

```text
rshield:{subreddit}:dashboard
rshield:{subreddit}:thread:{id}
```

---

# ⚡ Event Trigger Architecture

rShield uses Devvit event triggers:
- onAppInstall
- onPostSubmit
- onCommentSubmit

These triggers:
- initialize telemetry
- ingest posts instantly
- track comments live
- maintain operational awareness

---

# 🎮 Simulation Mode

rShield includes a cinematic Simulation Mode for:
- demos
- onboarding
- hackathon presentations
- moderator training

Simulation scenes include:
1. Calm baseline
2. Escalation detection
3. Hostility acceleration
4. Critical containment
5. Recovery stabilization

Simulation telemetry NEVER overrides real subreddit telemetry.

---

# 🖥️ Dashboard Features

## Threat Monitor Feed

Displays:
- live subreddit posts
- usernames
- threat %
- escalation state
- lock status
- telemetry indicators

---

## Active Risk Profile

Displays:
- active thread
- threat timeline
- escalation logs
- AI threat classification
- operational status

---

## Live Telemetry

Tracks:
- toxicity density
- comment velocity
- escalation probability
- repeat offenders
- keyword volatility
- hostility progression

---

## Intervention Console

Moderators can:
- lock threads
- unlock threads
- throttle escalation
- activate containment

directly from the dashboard.

---

# 🧩 Why Devvit?

Devvit enables rShield to operate natively inside Reddit.

Benefits:
- real moderation APIs
- subreddit-scoped permissions
- Reddit identity integration
- event triggers
- serverless deployment
- native subreddit installation

Without Devvit, systems like rShield would not be possible.

---

# 🏗️ System Architecture

```text
┌─────────────────────────────────────────────┐
│               rShield Client                │
│   React + TypeScript + Vite                 │
│                                             │
│   ├── Threat Feed                           │
│   ├── Telemetry Panels                      │
│   ├── AI Prediction Systems                 │
│   └── Moderator Controls                    │
└───────────────────┬─────────────────────────┘
                    │
                    │ HTTP / Devvit WebView
                    │
┌───────────────────▼─────────────────────────┐
│               rShield Server                │
│        Hono + Devvit Serverless             │
│                                             │
│   ├── Live ingestion engine                 │
│   ├── Threat intelligence engine            │
│   ├── Telemetry synchronization             │
│   ├── Moderation endpoints                  │
│   └── Event trigger processing              │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│             Devvit Platform                 │
│                                             │
│   ├── Reddit APIs                           │
│   ├── Redis State Storage                   │
│   ├── Post/Comment Triggers                 │
│   └── Moderator Authentication              │
└─────────────────────────────────────────────┘
```

---

# 🔧 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 |
| Styling | TailwindCSS 4 |
| Build System | Vite |
| Backend | Hono |
| Runtime | Node.js |
| Platform | Devvit |
| State | Redis |
| APIs | Reddit Devvit APIs |
| Language | TypeScript |

---

# 📂 Project Structure

```text
src/
├── client/
│   ├── game.tsx
│   ├── splash.tsx
│   └── hooks/
│       └── useDashboard.ts
│
├── server/
│   ├── auth/
│   │   └── modGuard.ts
│   │
│   ├── core/
│   │   ├── subredditScanner.ts
│   │   ├── riskEngine.ts
│   │   ├── storage.ts
│   │   └── post.ts
│   │
│   ├── routes/
│   │   ├── api.ts
│   │   ├── triggers.ts
│   │   └── menu.ts
│   │
│   └── index.ts
│
└── shared/
    └── api.ts
```

---

# ⚙️ Environment Variables

Create:

```bash
.env
```

Example:

```env
OPENAI_API_KEY=
```

---

# 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| /api/init | GET | Initialize dashboard |
| /api/dashboard | GET | Fetch live telemetry |
| /api/thread/:id | GET | Fetch thread state |
| /api/thread/:id/action | POST | Execute mod action |
| /api/scan | POST | Force subreddit scan |
| /api/simulation/step | POST | Advance simulation |
| /api/simulation/reset | POST | Reset simulation |
| /api/verify | GET | Health check |

---

# 🔐 Security Model

Every moderation endpoint validates:
- Reddit identity
- moderator status
- subreddit scope

Non-moderators cannot:
- lock threads
- unlock discussions
- execute interventions
- modify telemetry

---

# 🎥 Demo Walkthrough

## Demo Flow

1. Install rShield
2. Create subreddit posts
3. Add escalating comments
4. Observe rising telemetry
5. Watch threat score increase
6. Lock thread
7. Observe stabilization
8. Unlock thread
9. Verify recovery

---

# 🏆 Hackathon Positioning

rShield demonstrates what Reddit moderation can become when it is:
- predictive
- operational
- intelligent
- cinematic
- real-time

Instead of reactive moderation,
rShield introduces:

# AI-powered community defense infrastructure.

---

# ❤️ Why rShield Matters

Communities are living systems.

Discussions escalate.
Toxicity spreads.
Brigades emerge.

Traditional moderation reacts AFTER damage occurs.

rShield changes moderation from:

```text
Reactive moderation
```

into:

```text
Predictive AI community defense
```

This is the future of Reddit moderation.

---

# 🗺️ Future Roadmap

- OpenAI-powered semantic analysis
- Cross-subreddit threat intelligence
- AI moderation recommendations
- Historical escalation analytics
- Discord/Slack integrations
- Moderator collaboration systems
- Advanced behavioral intelligence
- Mobile telemetry dashboard

---

# 📄 License

MIT License