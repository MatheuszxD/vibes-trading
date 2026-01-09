'use client';

import { useState } from 'react';
import { Stats, SystemStatus, toggleMode } from '@/lib/supabase';

interface PaperModePanelProps {
  stats: Stats | null;
  status: SystemStatus | null;
  onModeChange: () => void;
}

export default function PaperModePanel({ stats, status, onModeChange }: PaperModePanelProps) {
  const [isToggling, setIsToggling] = useState(false);

  const isPaperMode = status?.mode === 'PAPER';
  const balance = stats?.paper_balance || 10;
  const pnlSol = stats?.paper_pnl_sol || 0;
  const pnlPercent = stats?.paper_pnl_percent || 0;
  const winRate = stats?.paper_win_rate || 0;
  const trades = stats?.paper_trades || 0;
  const wins = stats?.paper_wins || 0;
  const losses = stats?.paper_losses || 0;
  const openPositions = stats?.paper_open || 0;

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);

    const success = await toggleMode(!isPaperMode);
    if (success) {
      onModeChange();
    }

    setTimeout(() => setIsToggling(false), 500);
  };

  const formatPnl = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(4)}`;
  };

  return (
    <div className="bg-terminal-card border border-terminal-border">
      {/* Header with Toggle */}
      <div className="border-b border-terminal-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-pixel text-xs text-terminal-amber">
            {isPaperMode ? 'PAPER MODE' : 'LIVE MODE'}
          </h2>
        </div>
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            isPaperMode ? 'bg-terminal-amber' : 'bg-terminal-green'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              isPaperMode ? 'left-1' : 'left-7'
            }`}
          />
        </button>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        {/* Balance */}
        <div className="flex justify-between items-center">
          <span className="text-terminal-text-dim text-xs">BALANCE</span>
          <span className="text-terminal-text font-mono text-sm">
            {balance.toFixed(4)} SOL
          </span>
        </div>

        {/* PNL */}
        <div className="flex justify-between items-center">
          <span className="text-terminal-text-dim text-xs">PNL</span>
          <span
            className={`font-mono text-sm ${
              pnlSol >= 0 ? 'text-terminal-green' : 'text-terminal-red'
            }`}
          >
            {formatPnl(pnlSol)} SOL ({formatPnl(pnlPercent)}%)
          </span>
        </div>

        {/* Win Rate */}
        <div className="flex justify-between items-center">
          <span className="text-terminal-text-dim text-xs">WIN RATE</span>
          <span
            className={`font-mono text-sm ${
              winRate >= 50 ? 'text-terminal-green' : 'text-terminal-red'
            }`}
          >
            {winRate.toFixed(1)}%
          </span>
        </div>

        {/* Trades */}
        <div className="flex justify-between items-center">
          <span className="text-terminal-text-dim text-xs">TRADES</span>
          <span className="text-terminal-text font-mono text-sm">
            {trades}{' '}
            <span className="text-terminal-green">{wins}w</span>
            {' / '}
            <span className="text-terminal-red">{losses}l</span>
            {' '}
            <span className="text-terminal-amber">OPEN {openPositions}</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-border p-3">
        <div className="text-xs text-terminal-text-dim text-center">
          Started with 10 SOL
        </div>
      </div>
    </div>
  );
}
