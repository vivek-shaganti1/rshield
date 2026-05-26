import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useDashboard } from './hooks/useDashboard';
import type { MetricPoint } from '../shared/api';

export const App = () => {
  const {
    loading,
    dashboardData,
    activeThread,
    setActiveThreadId,
    executeAction,
    advanceSimulation,
    resetSimulation,
    actionPending,
    simPending,
    rescan,
  } = useDashboard();

  const [consoleMsg, setConsoleMsg] = useState<string | null>(null);

  if (loading || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cyber-bg font-mono text-cyan-400 cyber-scanlines">
        <div className="cyber-scanline"></div>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg animate-pulse uppercase tracking-widest text-glow-blue">Loading rShield Core...</div>
          <div className="text-xs text-slate-500">INIT DATABASE CONNECTION // SECURE REDIS TUNNEL</div>
        </div>
      </div>
    );
  }

  const { subredditName, health, threads, systemLogs, simulationScene } = dashboardData;

  const handleAction = async (postId: string, action: 'lock' | 'unlock' | 'slowmode_enable' | 'slowmode_disable' | 'quarantine' | 'restore_stability') => {
    setConsoleMsg(`EXECUTING INTERVENTION: ${action.toUpperCase()} ON ${postId}...`);
    await executeAction(postId, action);
    setTimeout(() => setConsoleMsg(null), 3000);
  };

  const handleSimStep = async (scene: number) => {
    setConsoleMsg(`INJECTING SIMULATION SCENARIO: STEP ${scene}...`);
    await advanceSimulation(scene);
    setTimeout(() => setConsoleMsg(null), 3000);
  };

  // Helper to color codes
  const getRiskColor = (score: number, quarantined = false) => {
    if (quarantined) return 'text-purple-400';
    if (score < 35) return 'text-emerald-400';
    if (score < 65) return 'text-amber-400';
    return 'text-red-400';
  };

  const getRiskBg = (score: number, quarantined = false) => {
    if (quarantined) return 'bg-purple-950/20 border-purple-500/40';
    if (score < 35) return 'bg-emerald-500/10 border-emerald-500/30';
    if (score < 65) return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getRiskGlowClass = (score: number, quarantined = false) => {
    if (quarantined) return 'cyber-glow-purple';
    if (score < 35) return 'border-emerald-500/50';
    if (score < 65) return 'cyber-glow-orange';
    return 'cyber-glow-red';
  };

  // Render SVG Sparkline
  const renderSparkline = (history: MetricPoint[]) => {
    if (history.length < 2) return null;
    const width = 500;
    const height = 120;
    const padding = 10;
    
    // Find min and max
    const maxVal = 100;
    const minVal = 0;
    
    const points = history.map((p, index) => {
      const x = padding + (index / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.riskScore - minVal) / (maxVal - minVal)) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="#1e293b" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="#1e293b" strokeDasharray="3,3" />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="#1e293b" strokeDasharray="3,3" />
        
        {/* Fill Area */}
        <polygon points={fillPoints} fill="url(#chartGradient)" />
        
        {/* Line */}
        <polyline
          fill="none"
          stroke="#06b6d4"
          strokeWidth="3"
          points={points}
          className="drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
        />
        
        {/* Interactive glow point at the end */}
        {history.length > 0 && (() => {
          const lastIndex = history.length - 1;
          const lastPoint = history[lastIndex];
          if (!lastPoint) return null;
          const lastX = padding + (lastIndex / (history.length - 1)) * (width - padding * 2);
          const lastY = height - padding - ((lastPoint.riskScore - minVal) / (maxVal - minVal)) * (height - padding * 2);
          return (
            <circle
              cx={lastX}
              cy={lastY}
              r="5"
              fill={lastPoint.riskScore > 65 ? '#ef4444' : '#06b6d4'}
              className="animate-ping"
            />
          );
        })()}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-mono flex flex-col relative cyber-grid cyber-scanlines overflow-hidden pb-10">
      <div className="cyber-scanline"></div>

      {/* Cyber Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 border-b border-slate-800 bg-[#070b13]/85 backdrop-blur relative z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3.5 h-3.5 rounded-full ${
              health.status === 'calm' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
              health.status === 'degraded' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 
              'bg-red-500 shadow-[0_0_12px_#ef4444]'
            } animate-pulse`}></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-cyan-400 text-glow-blue flex items-center gap-2">
              rShield // <span className="text-white">PREDICTIVE SHIELD</span>
              {dashboardData.simulationActive ? (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-purple-500/60 bg-purple-950/30 text-purple-400 text-[9px] font-bold uppercase tracking-widest shadow-[0_0_6px_rgba(168,85,247,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping inline-block"></span>
                  SIMULATION
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-emerald-500/60 bg-emerald-950/30 text-emerald-400 text-[9px] font-bold uppercase tracking-widest shadow-[0_0_6px_rgba(16,185,129,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  LIVE MODE
                </span>
              )}
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">AI Subreddit Immune Intelligence System</p>
          </div>
        </div>

        {/* Global Statistics */}
        <div className="flex flex-wrap items-center gap-6 text-[11px] bg-slate-950/80 px-4 py-2 rounded border border-slate-800/80">
          <div>
            <span className="text-slate-500 uppercase">SUBREDDIT:</span>{' '}
            <span className="text-cyan-400 font-bold">{subredditName}</span>
          </div>
          <div className="hidden sm:block text-slate-700">|</div>
          <div>
            <span className="text-slate-500 uppercase">SYS STABILITY:</span>{' '}
            <span className={getRiskColor(100 - health.healthScore)}>{health.healthScore}%</span>
          </div>
          <div className="hidden sm:block text-slate-700">|</div>
          <div>
            <span className="text-slate-500 uppercase">ALERTS ACTIVE:</span>{' '}
            <span className={health.activeAlertsCount > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}>
              {health.activeAlertsCount}
            </span>
          </div>
          <div className="hidden sm:block text-slate-700">|</div>
          <div>
            <span className="text-slate-500 uppercase">MOD ACTIONS:</span>{' '}
            <span className="text-slate-200">{health.moderatorActionsCount}</span>
          </div>
          <div className="hidden sm:block text-slate-700">|</div>
          <div>
            {dashboardData.simulationActive ? (
              <button
                onClick={resetSimulation}
                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition-all bg-purple-950 border border-purple-500/60 text-purple-400 hover:bg-purple-900 cursor-pointer shadow-[0_0_6px_rgba(168,85,247,0.2)] outline-none"
              >
                ⟳ Switch to Live Mode
              </button>
            ) : (
              <button
                onClick={() => handleSimStep(1)}
                className="px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider transition-all bg-emerald-950 border border-emerald-500/60 text-emerald-400 hover:bg-emerald-900 cursor-pointer shadow-[0_0_6px_rgba(16,185,129,0.2)] outline-none"
              >
                ⚡ Run Simulation Demo
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Command Dashboard */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Dynamic Telemetry Status Banner (UX Fix 2) */}
        <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center bg-[#070b13]/90 border border-slate-800 rounded px-4 py-3 text-xs tracking-wider relative overflow-hidden backdrop-blur-sm shadow-[0_0_15px_rgba(3,7,18,0.5)] gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              activeThread?.quarantined ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' :
              activeThread?.locked ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
              activeThread && activeThread.riskScore > 65 ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
              activeThread && activeThread.riskScore > 35 ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' :
              'bg-emerald-500 shadow-[0_0_10px_#10b981]'
            }`}></span>
            <span className="text-slate-500 uppercase font-semibold">Community Status:</span>
            <span className={`font-bold ${
              activeThread?.quarantined ? 'text-purple-400' :
              activeThread?.locked ? 'text-red-400 font-bold' :
              activeThread && activeThread.riskScore > 65 ? 'text-red-400' :
              activeThread && activeThread.riskScore > 35 ? 'text-amber-400' :
              'text-emerald-400'
            }`}>
              {activeThread?.quarantined ? '🔴 EMERGENCY CONTAINMENT // QUARANTINED' :
               activeThread?.locked ? '🔒 THREAD SECURED // LOCKED' :
               activeThread && activeThread.riskScore > 65 ? '🚨 CRISIS MELTDOWN' :
               activeThread && activeThread.riskScore > 35 ? '⚠️ VOLATILE ENGAGEMENT WARNING' :
               '🟢 COMMUNITY STABILIZED // PASSIVE SECURE MONITORING'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span>Threat Score: <span className="text-slate-300 font-bold">{activeThread ? activeThread.riskScore : 0}%</span></span>
            <span>|</span>
            <span>Decay Rate: <span className="text-emerald-500 font-bold">ACTIVE (-3pts/20s)</span></span>
          </div>
        </div>
        
        {/* Left Column: Subreddit Health and Threat Feed (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Health Gauge Panel */}
          <div className="border border-slate-800 bg-[#070b13]/90 rounded p-5 flex flex-col items-center justify-center text-center relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 bg-cyan-950/20 border-r border-b border-slate-800 px-2 py-0.5 text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              COMMUNITY BIOMETRICS
            </div>
            
            <div className="relative w-40 h-40 flex items-center justify-center mt-3">
              {/* SVG Gauge */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#111827" strokeWidth="8" fill="transparent" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={
                    health.status === 'calm' ? '#10b981' : 
                    health.status === 'degraded' ? '#f59e0b' : 
                    '#ef4444'
                  }
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * health.healthScore) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 6px ${
                      health.status === 'calm' ? 'rgba(16,185,129,0.8)' : 
                      health.status === 'degraded' ? 'rgba(245,158,11,0.8)' : 
                      'rgba(239,68,68,0.8)'
                    })`
                  }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono">
                <span className={`text-4xl font-extrabold tracking-tight ${
                  health.status === 'calm' ? 'text-glow-green text-emerald-400' : 
                  health.status === 'degraded' ? 'text-glow-orange text-amber-400' : 
                  'text-glow-red text-red-500'
                }`}>
                  {health.healthScore}%
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">SHIELD STATUS</span>
              </div>
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-slate-400 font-bold">
              SYSTEM LEVEL: <span className={
                health.status === 'calm' ? 'text-emerald-400' : 
                health.status === 'degraded' ? 'text-amber-400' : 
                'text-red-500 animate-pulse font-bold'
              }>{health.status.toUpperCase()}</span>
            </div>

            {/* Health Metrics Panel (FIX 9) */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800/85 grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase text-[8px] tracking-wide">Stability</span>
                <span className={`font-bold ${getRiskColor(100 - (health.communityStability ?? 100))}`}>
                  {health.communityStability ?? 96}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-x border-slate-800/85 px-1">
                <span className="text-slate-500 uppercase text-[8px] tracking-wide">Velocity</span>
                <span className={`font-bold uppercase ${
                  health.hostilityVelocity === 'rising' ? 'text-red-400 animate-pulse' :
                  health.hostilityVelocity === 'falling' ? 'text-emerald-400' :
                  'text-slate-400'
                }`}>
                  {health.hostilityVelocity ?? 'stable'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-slate-500 uppercase text-[8px] tracking-wide">Mod Load</span>
                <span className={`font-bold ${
                  health.moderatorLoad === 'High' ? 'text-red-400' :
                  health.moderatorLoad === 'Moderate' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {health.moderatorLoad ?? 'Low'}
                </span>
              </div>
            </div>
          </div>

          {/* Threat Feed List */}
          <div className="border border-slate-800 bg-[#070b13]/90 rounded flex flex-col flex-1 min-h-[300px] relative overflow-hidden backdrop-blur-sm">
            <div className="bg-slate-905 border-b border-slate-800 px-4 py-2 text-xs text-cyan-400 font-bold uppercase tracking-widest flex justify-between items-center gap-2">
              <span>🔥 THREAT MONITOR FEED</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">TRACKING: {threads.filter(t => !t.id.includes('simulated') && !t.id.includes('default')).length} LIVE</span>
                <button
                  onClick={() => void rescan()}
                  title="Force rescan subreddit"
                  className="text-[9px] px-2 py-0.5 rounded border border-cyan-800/60 bg-cyan-950/20 text-cyan-400 hover:bg-cyan-900/30 uppercase tracking-wider transition-all"
                >
                  ⟳ SCAN
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {threads.map((t) => {
                const isActive = t.id === activeThread?.id;
                const isSimThread = t.id.includes('simulated');
                const isDefaultThread = t.id === 't3_default_discussion';
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveThreadId(t.id)}
                    className={`text-left p-3 rounded border transition-all duration-200 outline-none flex flex-col gap-2 ${
                      isActive
                        ? 'border-cyan-500/80 bg-cyan-950/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                        : 'border-slate-800/80 bg-slate-950/50 hover:bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-slate-200 line-clamp-1 flex-1 font-sans">{t.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* LIVE / SIM / DEFAULT source badge */}
                        {isSimThread ? (
                          <span className="text-[8px] font-mono px-1 py-0.5 rounded border border-purple-800/60 bg-purple-950/30 text-purple-400 uppercase">SIM</span>
                        ) : isDefaultThread ? (
                          <span className="text-[8px] font-mono px-1 py-0.5 rounded border border-slate-700/60 bg-slate-900/30 text-slate-500 uppercase">DEFAULT</span>
                        ) : (
                          <span className="text-[8px] font-mono px-1 py-0.5 rounded border border-emerald-800/60 bg-emerald-950/30 text-emerald-400 uppercase">LIVE</span>
                        )}
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                          t.status === 'locked' ? 'bg-slate-900 border-slate-700 text-slate-400' :
                          t.status === 'critical' ? 'bg-red-950/30 border-red-700/50 text-red-400 animate-pulse' :
                          t.status === 'warning' ? 'bg-amber-950/30 border-amber-700/50 text-amber-400' :
                          'bg-emerald-950/20 border-emerald-900/40 text-emerald-400'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>u/{t.author}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span>RISK:</span>
                        <span className={`font-bold ${getRiskColor(t.riskScore)}`}>{t.riskScore}%</span>
                      </div>
                    </div>

                    {/* Miniature indicator progress bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.riskScore < 35 ? 'bg-emerald-500' :
                          t.riskScore < 65 ? 'shimmer-bar' :
                          'shimmer-bar-red'
                        }`}
                        style={{ width: `${t.riskScore}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}

              {threads.length === 0 && (
                <div className="text-center py-10 text-xs text-slate-600">NO ACTIVE TARGETS MONITORED</div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Active Thread Analytics & Intervention Terminal (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {activeThread ? (
            <>
              {/* Selected Thread Title Header */}
              <div className={`border p-4 rounded bg-[#070b13]/90 relative backdrop-blur-sm flex flex-col gap-3 ${getRiskBg(activeThread.riskScore, activeThread.quarantined)} ${getRiskGlowClass(activeThread.riskScore, activeThread.quarantined)} ${
                activeThread.quarantined ? 'containment-flicker' : 
                activeThread.riskScore > 65 ? 'threat-pulse' : ''
              }`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400 font-mono uppercase tracking-widest">
                       ACTIVE RISK PROFILE
                    </span>
                    <h2 className="text-sm md:text-base font-bold text-slate-200 mt-2 font-sans">{activeThread.title}</h2>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Target ID: <span className="text-slate-400">{activeThread.id}</span> | Submitted by: u/{activeThread.author}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest">THREAD RISK LEVEL</div>
                    <div className={`text-4xl font-extrabold tracking-tight ${getRiskColor(activeThread.riskScore, activeThread.quarantined)}`}>
                      {activeThread.riskScore}%
                    </div>
                    {/* Why? Tooltip Telemetry (UX Fix 4) */}
                    <div className="text-[9px] text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900 mt-1 max-w-[180px] leading-tight text-center">
                      {activeThread.quarantined ? 'Quarantine Active (Containment mode)' :
                       activeThread.locked ? 'Secured: locked thread status' :
                       activeThread.toxicity > 50 && activeThread.replyVelocity > 8 ? 'Elevated toxicity & rapid reply velocity' :
                       activeThread.repeatOffendersCount >= 2 ? 'Active repeat offender arguments' :
                       activeThread.keywordVolatility > 35 ? 'Highly controversial keywords matching' :
                       activeThread.riskScore > 65 ? 'Stress sensors exceeding threshold limits' :
                       activeThread.riskScore > 35 ? 'Warning: mild hostility triggers' :
                       'Clean: stable passive monitoring'}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {activeThread.locked && (
                    <span className="bg-red-950/40 border border-red-800/60 text-red-400 px-2 py-0.5 rounded font-mono">
                      🔒 THREAD LOCKED
                    </span>
                  )}
                  {activeThread.slowModeEnabled && (
                    <span className="bg-amber-950/40 border border-amber-800/60 text-amber-400 px-2 py-0.5 rounded font-mono">
                      ⚡ ENGAGEMENT THROTTLING ACTIVE
                    </span>
                  )}
                  {activeThread.slowModeEnabled && (
                    <span className="bg-slate-900 border border-amber-900/40 text-amber-300/60 px-2 py-0.5 rounded font-mono text-[9px]">
                      ⚠ AI-driven engagement cooldown layer active
                    </span>
                  )}
                  {activeThread.quarantined && (
                    <span className="bg-purple-950/40 border border-purple-800/60 text-purple-400 px-2 py-0.5 rounded font-mono">
                      ☣ QUARANTINED CONTAINMENT
                    </span>
                  )}
                  {!activeThread.locked && !activeThread.slowModeEnabled && !activeThread.quarantined && (
                    <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                      🛡 PASSIVE DEVIANCE FILTERING ACTIVE
                    </span>
                  )}

                  {/* Comment Cluster Badges (FIX 5) */}
                  {activeThread.clusterDetected && activeThread.commentClusters && activeThread.commentClusters.map((cluster, idx) => (
                    <span key={idx} className="bg-purple-950/40 border border-purple-800/60 text-purple-300 px-2 py-0.5 rounded font-mono text-[9px] flex items-center gap-1.5 animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.2)]">
                      <span>⚠️ {cluster.clusterType.toUpperCase()}:</span>
                      <span>{cluster.participants.join(' ⟷ ')} ({cluster.hostileExchanges} exchanges)</span>
                    </span>
                  ))}
                </div>

                {/* Threat Timeline (FIX 4) */}
                <div className="mt-1 pt-2 border-t border-slate-900">
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>🛡️ IMMUNE ENGINE EVENT LOG (THREAT TIMELINE)</span>
                    <span className="text-cyan-400/50 font-normal">CHRONOLOGICAL PATH</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[9px] font-mono">
                    {activeThread.threatHistory && activeThread.threatHistory.map((entry, index) => {
                      const levelLabel = entry.threatLevel.toUpperCase();
                      const colorClass = levelLabel === 'CONTAINMENT' ? 'text-purple-400' :
                                         levelLabel === 'CRITICAL' ? 'text-red-400' :
                                         levelLabel === 'HOSTILE' ? 'text-amber-400' :
                                         levelLabel === 'ELEVATED' ? 'text-yellow-400' : 'text-emerald-400';
                      const bgClass = levelLabel === 'CONTAINMENT' ? 'bg-purple-950/20 border-purple-900/40' :
                                      levelLabel === 'CRITICAL' ? 'bg-red-950/20 border-red-900/40' :
                                      levelLabel === 'HOSTILE' ? 'bg-amber-950/20 border-amber-900/40' :
                                      levelLabel === 'ELEVATED' ? 'bg-yellow-950/20 border-yellow-900/40' : 'bg-slate-950 border-slate-900';
                      return (
                        <div key={index} className="flex items-center gap-1.5 flex-shrink-0" title={entry.trigger || 'No description'}>
                          {index > 0 && <span className="text-slate-800">→</span>}
                          <div className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${bgClass}`}>
                            <span className="text-slate-600 text-[8px]">{new Date(entry.timestamp).toTimeString().slice(0, 8)}</span>
                            <span className={`font-bold ${colorClass}`}>{levelLabel}</span>
                            <span className="text-slate-500 font-normal">({entry.riskScore}%)</span>
                            {entry.trigger && <span className="text-[8px] text-slate-400 border-l border-slate-800 pl-1">{entry.trigger}</span>}
                          </div>
                        </div>
                      );
                    })}
                    {(!activeThread.threatHistory || activeThread.threatHistory.length === 0) && (
                      <span className="text-[9px] text-slate-600">Passive monitoring baseline.</span>
                    )}
                  </div>
                </div>

                {/* Recovery State Progression (Fix 6) */}
                {activeThread.recoveryState && activeThread.recoveryState !== 'none' && (
                  <div className="mt-2 pt-2 border-t border-slate-900">
                    <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between">
                      <span>☣️ CONTAINER RECOVERY PROGRESSION</span>
                      <span className="text-purple-400 font-bold uppercase tracking-wide">ACTIVE RESTORE ROUTINE</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center">
                      <div className={`py-1 rounded border ${
                        activeThread.recoveryState === 'containment_active'
                          ? 'bg-red-950/40 border-red-500 text-red-400 font-bold animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600'
                      }`}>
                        Containment Active
                      </div>
                      <div className={`py-1 rounded border ${
                        activeThread.recoveryState === 'hostility_reduced'
                          ? 'bg-amber-950/40 border-amber-500 text-amber-400 font-bold animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600'
                      }`}>
                        Hostility Reduced
                      </div>
                      <div className={`py-1 rounded border ${
                        activeThread.recoveryState === 'recovery_monitoring'
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400 font-bold animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600'
                      }`}>
                        Recovery Monitoring
                      </div>
                      <div className={`py-1 rounded border ${
                        activeThread.recoveryState === 'stability_restored'
                          ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 font-bold recovery-breathe shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-950/30 border-slate-900 text-slate-600'
                      }`}>
                        Stability Restored
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Graphical Trend & Risk Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Sparkline Graph Panel (7 cols) */}
                <div className="md:col-span-7 border border-slate-800 bg-[#070b13]/90 rounded p-4 flex flex-col backdrop-blur-sm">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                    <span>📈 COGNITIVE STRESS TRACKER (RISK TIMELINE)</span>
                    <span className="text-slate-500 font-normal">REAL-TIME TELEMETRY</span>
                  </div>
                  <div className="h-32 bg-slate-950/80 rounded border border-slate-900 p-2 flex items-center justify-center">
                    {activeThread.metricsHistory && activeThread.metricsHistory.length > 0 ? (
                      renderSparkline(activeThread.metricsHistory)
                    ) : (
                      <span className="text-xs text-slate-700">AWAITING CORRELATION POINTS...</span>
                    )}
                  </div>
                </div>

                {/* Score breakdown parameters (5 cols) */}
                <div className="md:col-span-5 border border-slate-800 bg-[#070b13]/90 rounded p-4 flex flex-col justify-between gap-3 backdrop-blur-sm">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">🎛 SENSOR BREAKDOWN</div>
                  
                  <div className="flex flex-col gap-2.5 text-xs">
                    {/* Toxicity Average */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">TOXICITY DENSITY:</span>
                        <span className={getRiskColor(activeThread.toxicity)}>{activeThread.toxicity}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded overflow-hidden border border-slate-900">
                        <div className={`h-full transition-all duration-500 ${
                          activeThread.toxicity < 35 ? 'bg-emerald-500' :
                          activeThread.toxicity < 65 ? 'shimmer-bar' :
                          'shimmer-bar-red'
                        }`} style={{ width: `${activeThread.toxicity}%` }}></div>
                      </div>
                    </div>

                    {/* Reply Velocity */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">REPLY VELOCITY:</span>
                        <span className={activeThread.replyVelocity > 15 ? 'text-red-400' : 'text-slate-200'}>
                          {activeThread.replyVelocity.toFixed(1)}/min
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded overflow-hidden border border-slate-900">
                        <div className={`h-full transition-all duration-500 ${
                          activeThread.replyVelocity * 4 > 65 ? 'shimmer-bar-red' : 
                          activeThread.replyVelocity * 4 > 35 ? 'shimmer-bar' : 'bg-cyan-500'
                        }`} style={{ width: `${Math.min(100, activeThread.replyVelocity * 4)}%` }}></div>
                      </div>
                    </div>

                    {/* Report Spikes */}
                    <div className="flex justify-between text-[11px] border-b border-slate-900 pb-1.5">
                      <span className="text-slate-400">USER REPORT TELEMETRY:</span>
                      <span className={activeThread.reports > 10 ? 'text-red-400 font-bold' : 'text-slate-200'}>{activeThread.reports} flags</span>
                    </div>

                    {/* Repeat Offenders */}
                    <div className="flex justify-between text-[11px] border-b border-slate-900 pb-1.5">
                      <span className="text-slate-400">REPEAT OFFENDERS FLAG:</span>
                      <span className={activeThread.repeatOffendersCount > 1 ? 'text-amber-400 font-bold' : 'text-slate-200'}>{activeThread.repeatOffendersCount} users</span>
                    </div>

                    {/* Keyword Volatility */}
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">KEYWORD VOLATILITY:</span>
                      <span className={activeThread.keywordVolatility > 30 ? 'text-amber-400' : 'text-slate-200'}>{activeThread.keywordVolatility}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* AI Prediction Summary & Moderator Action Deck */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* AI Predictive Summary (7 cols) */}
                <div className="md:col-span-7 border border-slate-800 bg-[#070b13]/90 rounded p-4 flex flex-col justify-between backdrop-blur-sm">
                  <div>
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                      <span>🤖 RSHIELD AI IMMUNE ENGINE</span>
                    </div>

                    {/* AI Confidence & Escalation Probability (Fix 8) */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3 rounded border border-slate-900 my-3">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">Escalation Probability</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xl font-extrabold tracking-tight ${
                            (activeThread.escalationProbability ?? 0) > 65 ? 'text-red-400' :
                            (activeThread.escalationProbability ?? 0) > 35 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {activeThread.escalationProbability ?? 0}%
                          </span>
                          <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden border border-slate-800">
                            <div className={`h-full transition-all duration-500 ${
                              (activeThread.escalationProbability ?? 0) > 65 ? 'shimmer-bar-red' :
                              (activeThread.escalationProbability ?? 0) > 35 ? 'shimmer-bar' :
                              'bg-emerald-500'
                            }`} style={{ width: `${activeThread.escalationProbability ?? 0}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center pl-3 border-l border-slate-900">
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-mono">AI Confidence</span>
                        <div className="mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${
                            activeThread.escalationConfidence === 'HIGH' ? 'bg-red-950/40 border-red-800/60 text-red-400 shadow-[0_0_6px_rgba(239,68,68,0.15)]' :
                            activeThread.escalationConfidence === 'MEDIUM' ? 'bg-amber-950/40 border-amber-800/60 text-amber-400' :
                            'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                          }`}>
                            {activeThread.escalationConfidence ?? 'LOW'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans mt-2">
                      {activeThread.aiSummary || 'Running predictive simulations on thread metrics...'}
                    </p>
                  </div>

                  {activeThread.aiRecommendations && activeThread.aiRecommendations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-900 text-xs">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1.5">RECOMMENDED SHIELD STRATEGIES</div>
                      <ul className="flex flex-col gap-1 text-[11px] text-cyan-300/80">
                        {activeThread.aiRecommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-cyan-500">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Controls Deck (5 cols) */}
                <div className="md:col-span-5 border border-slate-800 bg-[#070b13]/90 rounded p-4 flex flex-col justify-between backdrop-blur-sm">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">🛠 INTERVENTION COMMANDS</div>
                  
                  <div className="flex flex-col gap-2 mt-3 flex-1 justify-center">
                    {/* Lock / Unlock Thread */}
                    {activeThread.locked ? (
                      <button
                        onClick={() => handleAction(activeThread.id, 'unlock')}
                        disabled={actionPending}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer"
                      >
                        🔓 Execute Thread Unlock
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(activeThread.id, 'lock')}
                        disabled={actionPending}
                        className={`w-full text-white border rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer ${
                          activeThread.riskScore > 65
                            ? 'bg-red-700/80 hover:bg-red-600 border-red-500 cyber-glow-red'
                            : 'bg-red-950/40 hover:bg-red-900 border-red-900 text-red-400'
                        }`}
                      >
                        🔒 Execute Thread Lock
                      </button>
                    )}

                    {/* Threat Throttling Toggle */}
                    {activeThread.slowModeEnabled ? (
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => handleAction(activeThread.id, 'slowmode_disable')}
                          disabled={actionPending}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer"
                        >
                          ⚡ Disable Threat Throttling
                        </button>
                        <span className="text-[9px] text-slate-500 text-center uppercase tracking-wide">Deactivate rate limiter</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => handleAction(activeThread.id, 'slowmode_enable')}
                          disabled={actionPending}
                          className={`w-full border rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer ${
                            activeThread.riskScore > 40 && activeThread.riskScore <= 65
                              ? 'bg-amber-700/80 hover:bg-amber-600 border-amber-500 cyber-glow-orange text-white'
                              : 'bg-amber-950/40 hover:bg-amber-900 border-amber-900 text-amber-400'
                          }`}
                        >
                          ⚡ Activate Threat Throttling
                        </button>
                        <span className="text-[9px] text-slate-500 text-center uppercase tracking-wide">Threat Throttling (AI engagement cooldown layer)</span>
                      </div>
                    )}

                    {/* Threat Quarantine / Restore Stability */}
                    {activeThread.quarantined ? (
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => handleAction(activeThread.id, 'restore_stability')}
                          disabled={actionPending}
                          className="w-full bg-emerald-950/80 hover:bg-emerald-900 text-emerald-400 border border-emerald-500 rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer animate-pulse shadow-[0_0_10px_#10b981]"
                        >
                          🟢 Restore Community Stability
                        </button>
                        <span className="text-[9px] text-slate-500 text-center uppercase tracking-wide font-semibold text-emerald-500/80">Quarantine Containment Lift Flow Active</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => handleAction(activeThread.id, 'quarantine')}
                          disabled={actionPending}
                          className={`w-full border rounded py-2 text-xs font-bold transition-all uppercase tracking-wider outline-none cursor-pointer ${
                            activeThread.riskScore > 65
                              ? 'bg-purple-700/80 hover:bg-purple-600 border-purple-500 cyber-glow-purple text-white animate-pulse'
                              : 'bg-purple-950/40 hover:bg-purple-900 border-purple-900 text-purple-400'
                          }`}
                        >
                          ☣ Containment Quarantine
                        </button>
                        <span className="text-[9px] text-slate-500 text-center uppercase tracking-wide">Containment Quarantine (Temporary thread stabilization mode)</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Comment Thread Logs */}
              <div className="border border-slate-800 bg-[#070b13]/90 rounded flex flex-col min-h-[220px] backdrop-blur-sm">
                <div className="bg-slate-905 border-b border-slate-800 px-4 py-2 text-xs text-cyan-400 font-bold uppercase tracking-widest">
                  💬 DEVIANCE COMMENTS TELEMETRY
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 max-h-72">
                  {activeThread.recentComments && activeThread.recentComments.length > 0 ? (
                    activeThread.recentComments.map((comm) => (
                      <div
                        key={comm.id}
                        className={`p-2.5 rounded border text-[11px] font-mono flex flex-col gap-1 ${
                          comm.toxicity > 65 ? 'bg-red-950/20 border-red-900/40' :
                          comm.toxicity > 35 ? 'bg-amber-950/20 border-amber-900/40' :
                          'bg-slate-950/50 border-slate-900'
                        }`}
                      >
                        <div className="flex justify-between text-slate-500">
                          <span className="text-cyan-400">u/{comm.author}</span>
                          <div className="flex items-center gap-2">
                            {comm.isRepeatOffender && (
                              <span className="text-red-400 font-bold uppercase tracking-wide bg-red-950/50 border border-red-900 px-1 rounded text-[9px]">
                                REPEAT OFFENDER
                              </span>
                            )}
                            {comm.isBrigadeCandidate && (
                              <span className="text-purple-400 font-bold uppercase tracking-wide bg-purple-950/50 border border-purple-900 px-1 rounded text-[9px]">
                                SWARM BRIGADER
                              </span>
                            )}
                            {comm.autoRemoved && (
                              <span className="text-rose-400 font-bold uppercase tracking-wide bg-rose-950/50 border border-rose-900 px-1 rounded text-[9px]">
                                AUTO-REMOVED
                              </span>
                            )}
                            <span>TOXICITY: <span className={getRiskColor(comm.toxicity)}>{comm.toxicity}%</span></span>
                          </div>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-sans">{comm.body}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-600">NO RECENT COMMENTS DETECTED IN LOG</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="border border-slate-800 bg-[#070b13]/90 rounded p-8 flex flex-col items-center justify-center text-center flex-1 backdrop-blur-sm">
              <span className="text-4xl">🛡</span>
              <h2 className="text-sm font-bold text-slate-400 mt-4 uppercase">NO THREAD TARGET SELECT</h2>
              <p className="text-xs text-slate-600 mt-1 max-w-sm font-sans">
                Select an active discussion thread from the left monitor feed to run predictive assessments and execute intervention policies.
              </p>
            </div>
          )}
        </section>

      </main>

      {/* Interactive Hackathon Simulation Deck */}
      <section className="max-w-7xl mx-auto w-full px-4 mt-2 mb-4 relative z-10">
        <div className="border border-slate-800 bg-[#0a0f1d] rounded p-4 relative overflow-hidden shadow-2xl">
          {/* Neon side border indicator */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-cyan-500"></div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                <span>🚨 DEMO SIMULATION DECK</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 max-w-lg font-sans">
                Use these buttons to simulate a live Reddit community stress crisis. Step from calm discussions to coordinated swarm raids, and watch rShield intercept escalation vectors.
              </p>
            </div>

            {/* Sim Controller Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1">SCENARIOS:</span>

              {/* Scene 1: Calm */}
              <button
                onClick={() => handleSimStep(1)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 1 && dashboardData.simulationActive
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                1. Calm
              </button>

              {/* Scene 2: Spicy Post */}
              <button
                onClick={() => handleSimStep(2)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 2 && dashboardData.simulationActive
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                2. Spicy Post
              </button>

              {/* Scene 3: Escalation */}
              <button
                onClick={() => handleSimStep(3)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 3 && dashboardData.simulationActive
                    ? 'bg-amber-950/80 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                3. Heat Rising
              </button>

              {/* Scene 4: Meltdown */}
              <button
                onClick={() => handleSimStep(4)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 4 && dashboardData.simulationActive
                    ? 'bg-red-950/80 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.2)] animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                4. Raid/Meltdown
              </button>

              {/* Scene 5: Recommendation */}
              <button
                onClick={() => handleSimStep(5)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 5 && dashboardData.simulationActive
                    ? 'bg-purple-950/80 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                5. Advice Alert
              </button>

              {/* Scene 6: Mitigated */}
              <button
                onClick={() => handleSimStep(6)}
                disabled={simPending}
                className={`px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                  simulationScene === 6 && dashboardData.simulationActive
                    ? 'bg-teal-950/80 border-teal-500 text-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.2)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                6. Restored
              </button>

              {/* Reset Sim */}
              <button
                onClick={resetSimulation}
                disabled={simPending}
                className="px-3 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 outline-none cursor-pointer"
              >
                Reset Sim
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Log Console */}
      <footer className="max-w-7xl mx-auto w-full px-4 relative z-10 flex flex-col gap-1.5">
        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest flex justify-between">
          <span>⚙ SYSTEM LIVE LOG CONSOLE</span>
          <span>ONLINE // STITCH PROTOCOL TUNNEL</span>
        </div>
        <div className="border border-slate-800 bg-[#02050b] p-3 rounded h-32 overflow-y-auto text-[10.5px] font-mono flex flex-col gap-1">
          {consoleMsg && (
            <div className="text-cyan-400 font-semibold animate-pulse">{`>>> ${consoleMsg}`}</div>
          )}
          {systemLogs.map((log, i) => (
            <div key={i} className={
              log.includes('WARNING') ? 'text-amber-400/90' :
              log.includes('CRITICAL') ? 'text-red-400/90' :
              log.includes('LOCKED') ? 'text-teal-400/90' :
              'text-slate-400'
            }>
              {log}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
