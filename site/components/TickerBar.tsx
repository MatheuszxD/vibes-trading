'use client';

import { Trade } from '@/lib/supabase';

interface TickerBarProps {
  trades: Trade[];
}

export default function TickerBar({ trades }: TickerBarProps) {
  // Get unique tokens with their latest PNL
  const tokenPnls = trades.reduce((acc, trade) => {
    if (trade.pnl_percent !== null && !acc[trade.symbol]) {
      acc[trade.symbol] = {
        symbol: trade.symbol,
        pnl: trade.pnl_percent,
      };
    }
    return acc;
  }, {} as Record<string, { symbol: string; pnl: number }>);

  const tickerItems = Object.values(tokenPnls);

  // If no trades, show placeholder
  if (tickerItems.length === 0) {
    return (
      <div className="bg-terminal-card border-b border-terminal-border py-2 overflow-hidden">
        <div className="text-center text-terminal-text-dim text-xs">
          Waiting for trades...
        </div>
      </div>
    );
  }

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="bg-terminal-card border-b border-terminal-border py-2 overflow-hidden">
      <div className="ticker-wrap">
        <div className="ticker flex gap-8">
          {duplicatedItems.map((item, index) => (
            <div key={`${item.symbol}-${index}`} className="flex items-center gap-2 whitespace-nowrap">
              <span className={item.pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                {item.pnl >= 0 ? '●' : '●'}
              </span>
              <span className="text-terminal-text font-medium text-sm">
                {item.symbol}
              </span>
              <span className={`text-sm font-mono ${item.pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
