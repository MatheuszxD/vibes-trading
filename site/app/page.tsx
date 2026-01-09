'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  supabase,
  getSystemStatus,
  getStats,
  getTrades,
  getThoughts,
  subscribeToTable,
  SystemStatus,
  Stats,
  Trade,
  Thought,
} from '@/lib/supabase';

import Header from '@/components/Header';
import TickerBar from '@/components/TickerBar';
import PreTradingAnalysis from '@/components/PreTradingAnalysis';
import ThoughtsTerminal from '@/components/ThoughtsTerminal';
import StatsCards from '@/components/StatsCards';
import PaperModePanel from '@/components/PaperModePanel';
import TradesList from '@/components/TradesList';

// Mock data for when Supabase is not connected
const mockStatus: SystemStatus = {
  id: 1,
  wallet_address: 'Demo...Mode',
  balance_sol: 0,
  status: 'ANALYZING',
  mode: 'PAPER',
  analysis_progress: 42,
  trades_analyzed: 42,
  trades_remaining: 58,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockStats: Stats = {
  id: 1,
  total_pnl_sol: 0,
  win_rate: 0,
  total_trades: 0,
  winning_trades: 0,
  losing_trades: 0,
  open_positions: 0,
  paper_balance: 10,
  paper_pnl_sol: 0,
  paper_pnl_percent: 0,
  paper_win_rate: 0,
  paper_trades: 0,
  paper_wins: 0,
  paper_losses: 0,
  paper_open: 0,
  updated_at: new Date().toISOString(),
};

const mockThoughts: Thought[] = [
  {
    id: '1',
    content: '> waiting for the bot to start trading ser\n> connect your supabase and run the bot\n> paper mode ready with 10 SOL\n> ngl this terminal looks kinda clean tho\n> gmi once you configure everything fr',
    trigger: 'AUTO',
    trades_count: 0,
    win_rate: 0,
    pnl_sol: 0,
    created_at: new Date().toISOString(),
  },
];

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(mockStatus);
  const [stats, setStats] = useState<Stats | null>(mockStats);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>(mockThoughts);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [statusData, statsData, tradesData, thoughtsData] = await Promise.all([
        getSystemStatus(),
        getStats(),
        getTrades(50),
        getThoughts(10),
      ]);

      // If we got data, use it
      if (statusData) {
        setStatus(statusData);
        setIsConnected(true);
      }
      if (statsData) setStats(statsData);
      if (tradesData && tradesData.length > 0) setTrades(tradesData);
      if (thoughtsData && thoughtsData.length > 0) setThoughts(thoughtsData);
    } catch (error) {
      console.log('Supabase not connected, using demo mode');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load with timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // Max 3 seconds loading

    fetchData().finally(() => {
      clearTimeout(timeout);
    });

    return () => clearTimeout(timeout);
  }, [fetchData]);

  // Realtime subscriptions (only if connected)
  useEffect(() => {
    if (!isConnected || !supabase) return;

    const channels: NonNullable<ReturnType<typeof subscribeToTable>>[] = [];

    try {
      const ch1 = subscribeToTable<SystemStatus>('system_status', (payload) => {
        if (payload.new) setStatus(payload.new);
      });
      if (ch1) channels.push(ch1);

      const ch2 = subscribeToTable<Stats>('stats', (payload) => {
        if (payload.new) setStats(payload.new);
      });
      if (ch2) channels.push(ch2);

      const ch3 = subscribeToTable<Trade>('trades', (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setTrades((prev) => [payload.new, ...prev].slice(0, 50));
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setTrades((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          );
        }
      });
      if (ch3) channels.push(ch3);

      const ch4 = subscribeToTable<Thought>('thoughts', (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setThoughts((prev) => [payload.new, ...prev].slice(0, 10));
        }
      });
      if (ch4) channels.push(ch4);
    } catch (error) {
      console.log('Failed to subscribe to realtime');
    }

    return () => {
      channels.forEach((channel) => {
        try {
          if (supabase) supabase.removeChannel(channel);
        } catch {}
      });
    };
  }, [isConnected]);

  // Calculate open positions
  const openPositions = trades.filter(
    (t) => t.side === 'BUY' && t.pnl_sol === null
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="text-center">
          <div className="font-pixel text-terminal-green text-xl mb-4 animate-pulse">
            VIBES
          </div>
          <div className="text-terminal-text-dim text-sm">
            Initializing<span className="animate-blink">...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo Mode Banner */}
      {!isConnected && (
        <div className="bg-terminal-amber/20 border-b border-terminal-amber text-terminal-amber text-center py-2 text-xs">
          DEMO MODE - Configure Supabase in .env.local to connect
        </div>
      )}

      {/* Header */}
      <Header status={status} />

      {/* Ticker Bar */}
      <TickerBar trades={trades} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pre-Trading Analysis */}
            <PreTradingAnalysis status={status} />

            {/* Stats Cards */}
            <StatsCards stats={stats} openPositions={openPositions} />

            {/* Thoughts Terminal */}
            <ThoughtsTerminal
              thoughts={thoughts}
              onRefresh={() => {
                if (isConnected) {
                  getThoughts(10).then(data => {
                    if (data && data.length > 0) setThoughts(data);
                  });
                }
              }}
            />

            {/* Trades List */}
            <TradesList trades={trades} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Paper Mode Panel */}
            <PaperModePanel
              stats={stats}
              status={status}
              onModeChange={fetchData}
            />

            {/* Wallet Info */}
            <div className="bg-terminal-card border border-terminal-border p-4">
              <h3 className="font-pixel text-xs text-terminal-text mb-3">
                WALLET
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-terminal-text-dim">Address</span>
                  <span className="text-terminal-text font-mono text-xs">
                    {status?.wallet_address
                      ? `${status.wallet_address.slice(0, 4)}...${status.wallet_address.slice(-4)}`
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-terminal-text-dim">Balance</span>
                  <span className="text-terminal-text font-mono">
                    {status?.balance_sol?.toFixed(4) || '0.0000'} SOL
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-terminal-card border border-terminal-border p-4">
              <h3 className="font-pixel text-xs text-terminal-text mb-3">
                LINKS
              </h3>
              <div className="space-y-2">
                <a
                  href="https://pump.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-terminal-green text-sm hover:underline"
                >
                  {'>'} pump.fun
                </a>
                <a
                  href="https://solscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-terminal-green text-sm hover:underline"
                >
                  {'>'} solscan.io
                </a>
                <a
                  href="https://github.com/MatheuszxD/vibes-trading"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-terminal-green text-sm hover:underline"
                >
                  {'>'} github repo
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-terminal-text-dim">
          <div>
            VIBES Trading v1.0.0 | Powered by Claude AI
          </div>
          <div>
            Built for Solana | Not Financial Advice
          </div>
        </div>
      </footer>
    </div>
  );
}
