import './index.css';

import { navigateTo } from '@devvit/web/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  const username = context.username ?? 'Moderator';
  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-5 bg-[#030712] text-slate-200 font-mono p-6 cyber-grid cyber-scanlines">
      <div className="cyber-scanline"></div>

      {/* Cyber Security Logo Frame */}
      <div className="relative flex flex-col items-center justify-center p-6 rounded-lg border border-slate-800 bg-[#070b13]/85 backdrop-blur-md max-w-sm w-full text-center cyber-glow-green">
        {/* Glow corner elements */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-500"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-500"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-500"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-500"></div>

        {/* Pulsing Eye / Radar Ring */}
        <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center relative mb-4">
          <div className="w-10 h-10 rounded-full border border-emerald-500/50 flex items-center justify-center animate-pulse">
            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
          </div>
        </div>

        <h1 className="text-lg font-bold tracking-widest text-emerald-400 text-glow-green uppercase">
          rShield // AI
        </h1>
        <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-1">
          The AI Immune System for Reddit Communities
        </p>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent my-4"></div>

        <p className="text-xs text-slate-400 leading-relaxed font-sans px-2">
          Deploy predictive threat containment to monitor escalation spikes, coordinated raids, and toxic engagement before they overload moderators.
        </p>

        <div className="text-[11px] text-slate-500 mt-4 uppercase">
          OPERATOR: <span className="text-cyan-400 font-bold">{username}</span>
        </div>

        <div className="flex items-center justify-center mt-5 w-full">
          <button
            className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white w-full h-10 rounded text-xs font-bold uppercase tracking-widest cursor-pointer transition-all outline-none shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_16px_rgba(16,185,129,0.5)]"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          >
            🛰 ACCESS THREAT DASHBOARD
          </button>
        </div>
      </div>

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 text-[9px] text-slate-600 uppercase tracking-widest">
        <button
          className="cursor-pointer hover:text-slate-400 transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-slate-800">|</span>
        <button
          className="cursor-pointer hover:text-slate-400 transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
