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

export default function Home() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all data
  const fetchData = useCallback(async () => {
    const [statusData, statsData, tradesData, thoughtsData] = await Promise.all([
      getSystemStatus(),
      getStats(),
      getTrades(50),
      getThoughts(10),
    ]);

    setStatus(statusData);
    setStats(statsData);
    setTrades(tradesData);
    setThoughts(thoughtsData);
    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const channels: ReturnType<typeof subscribeToTable>[] = [];

    // Subscribe to system_status changes
    channels.push(
      subscribeToTable<SystemStatus>('system_status', (payload) => {
        if (payload.new) setStatus(payload.new);
      })
    );

    // Subscribe to stats changes
    channels.push(
      subscribeToTable<Stats>('stats', (payload) => {
        if (payload.new) setStats(payload.new);
      })
    );

    // Subscribe to trades changes
    channels.push(
      subscribeToTable<Trade>('trades', (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setTrades((prev) => [payload.new, ...prev].slice(0, 50));
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setTrades((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          );
        }
      })
    );

    // Subscribe to thoughts changes
    channels.push(
      subscribeToTable<Thought>('thoughts', (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          setThoughts((prev) => [payload.new, ...prev].slice(0, 10));
        }
      })
    );

    // Cleanup
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, []);

  // Calculate open positions
  const openPositions = trades.filter(
    (t) => t.side === 'BUY' && t.pnl_sol === null
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-pixel text-terminal-green text-xl mb-4 animate-pulse">
            VIBES
          </div>
          <div className="text-terminal-text-dim text-sm">
            Loading<span className="animate-blink">...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
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
              onRefresh={() => getThoughts(10).then(setThoughts)}
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
                  href="https://github.com"
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
