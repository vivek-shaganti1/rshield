import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, ThreadState, InitResponse, ActionResponse, SimulationResponse } from '../../shared/api';

export const useDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionPending, setActionPending] = useState<boolean>(false);
  const [simPending, setSimPending] = useState<boolean>(false);

  // Fetch initial configuration
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const res = await fetch('/api/init');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: InitResponse = await res.json();
        if (mounted) {
          setDashboardData(data.dashboardData);
          setLoading(false);
          if (data.dashboardData.threads.length > 0) {
            const firstThread = data.dashboardData.threads[0];
            if (firstThread) {
              setActiveThreadId(firstThread.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to initialize rShield Dashboard:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  // Poll for live dashboard updates (routine updates from Reddit comment triggers)
  const pollDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardData = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to poll dashboard data:', err);
    }
  }, []);

  // On-demand force rescan of the real subreddit
  const rescan = useCallback(async () => {
    try {
      await fetch('/api/scan', { method: 'POST' });
      await pollDashboard();
    } catch (err) {
      console.error('Failed to rescan subreddit:', err);
    }
  }, [pollDashboard]);


  // Set up polling interval every 4 seconds when simulation is inactive
  useEffect(() => {
    const isSimActive = dashboardData?.simulationActive ?? false;
    const intervalTime = isSimActive ? 8000 : 4000; // poll slower during simulation scenes to let user read
    
    const interval = setInterval(() => {
      void pollDashboard();
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [pollDashboard, dashboardData?.simulationActive]);

  // Find currently active thread state
  const activeThread = dashboardData?.threads.find((t) => t.id === activeThreadId) || null;

  // Execute a moderation action
  const executeAction = useCallback(
    async (
      postId: string,
      action: 'lock' | 'unlock' | 'slowmode_enable' | 'slowmode_disable' | 'quarantine' | 'restore_stability'
    ) => {
      try {
        setActionPending(true);
        const res = await fetch(`/api/thread/${postId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ActionResponse = await res.json();
        
        if (data.success && data.threadState) {
          // Update local state immediately
          setDashboardData((prev) => {
            if (!prev) return null;
            const updatedThreads = prev.threads.map((t) =>
              t.id === postId ? (data.threadState as ThreadState) : t
            );
            return {
              ...prev,
              threads: updatedThreads,
            };
          });
        }
        
        // Refresh full dashboard
        await pollDashboard();
      } catch (err) {
        console.error('Failed executing moderation action:', err);
      } finally {
        setActionPending(false);
      }
    },
    [pollDashboard]
  );

  // Advance simulation to specific scene
  const advanceSimulation = useCallback(
    async (scene: number) => {
      try {
        setSimPending(true);
        const res = await fetch('/api/simulation/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scene }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SimulationResponse = await res.json();
        
        if (data.success) {
          setDashboardData(data.dashboardData);
          // Set active thread to simulated debate thread during simulation
          const hasSimThread = data.dashboardData.threads.some((t) => t.id === 't3_simulated_debate');
          if (hasSimThread) {
            setActiveThreadId('t3_simulated_debate');
          }
        }
      } catch (err) {
        console.error('Failed to advance simulation:', err);
      } finally {
        setSimPending(false);
      }
    },
    []
  );

  // Reset simulation and clear Redis DB states
  const resetSimulation = useCallback(async () => {
    try {
      setSimPending(true);
      const res = await fetch('/api/simulation/reset', {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SimulationResponse = await res.json();
      if (data.success) {
        setDashboardData(data.dashboardData);
        if (data.dashboardData.threads.length > 0) {
          const firstThread = data.dashboardData.threads[0];
          if (firstThread) {
            setActiveThreadId(firstThread.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setSimPending(false);
    }
  }, []);

  return {
    loading,
    dashboardData,
    activeThread,
    activeThreadId,
    setActiveThreadId,
    executeAction,
    advanceSimulation,
    resetSimulation,
    actionPending,
    simPending,
    refresh: pollDashboard,
    rescan,
  } as const;
};
