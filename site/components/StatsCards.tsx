'use client';

import { Stats } from '@/lib/supabase';

interface StatsCardsProps {
  stats: Stats | null;
  openPositions: number;
}

export default function StatsCards({ stats, openPositions }: StatsCardsProps) {
  const totalPnl = stats?.paper_pnl_sol || 0;
  const winRate = stats?.paper_win_rate || 0;
  const totalTrades = stats?.paper_trades || 0;
  const maxPositions = 5;

  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(4)} SOL`;
  };

  const cards = [
    {
      label: 'TOTAL PNL',
      value: formatPnl(totalPnl),
      color: totalPnl >= 0 ? 'text-terminal-green glow-green' : 'text-terminal-red glow-red',
    },
    {
      label: 'WIN RATE',
      value: `${winRate.toFixed(1)}%`,
      color: winRate >= 50 ? 'text-terminal-green' : 'text-terminal-amber',
    },
    {
      label: 'TOTAL TRADES',
      value: totalTrades.toString(),
      color: 'text-terminal-text',
    },
    {
      label: 'OPEN POS',
      value: `${openPositions} / ${maxPositions}`,
      color: openPositions > 0 ? 'text-terminal-amber' : 'text-terminal-text-dim',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-terminal-card border border-terminal-border p-4 card-hover"
        >
          <div className="text-terminal-text-dim text-xs font-mono mb-2">
            {card.label}
          </div>
          <div className={`font-pixel text-sm sm:text-base ${card.color}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
