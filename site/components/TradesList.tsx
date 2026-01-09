'use client';

import { Trade } from '@/lib/supabase';

interface TradesListProps {
  trades: Trade[];
}

export default function TradesList({ trades }: TradesListProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const formatAmount = (amount: number) => {
    return amount.toFixed(4);
  };

  const formatPnl = (pnl: number | null, percent: number | null) => {
    if (pnl === null) return '-';
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(4)} (${sign}${percent?.toFixed(1)}%)`;
  };

  if (trades.length === 0) {
    return (
      <div className="bg-terminal-card border border-terminal-border p-6">
        <div className="text-center text-terminal-text-dim text-sm">
          No trades yet. Waiting for opportunities...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-terminal-card border border-terminal-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-terminal-border p-4">
        <h2 className="font-pixel text-xs text-terminal-text">
          RECENT TRADES
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-text-dim text-xs">
              <th className="text-left p-3 font-normal">TIME</th>
              <th className="text-left p-3 font-normal">TOKEN</th>
              <th className="text-left p-3 font-normal">SIDE</th>
              <th className="text-right p-3 font-normal">AMOUNT</th>
              <th className="text-right p-3 font-normal">PNL</th>
              <th className="text-center p-3 font-normal">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 10).map((trade) => (
              <tr
                key={trade.id}
                className="border-b border-terminal-border/50 hover:bg-terminal-card-hover transition-colors"
              >
                <td className="p-3 text-terminal-text-dim font-mono text-xs">
                  {formatTime(trade.created_at)}
                </td>
                <td className="p-3">
                  <span className="text-terminal-text font-medium">
                    {trade.symbol}
                  </span>
                  {trade.is_paper && (
                    <span className="ml-2 text-xs text-terminal-amber">[P]</span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`font-mono ${
                      trade.side === 'BUY'
                        ? 'text-terminal-green'
                        : 'text-terminal-red'
                    }`}
                  >
                    {trade.side}
                  </span>
                </td>
                <td className="p-3 text-right font-mono text-terminal-text">
                  {formatAmount(trade.amount_sol)} SOL
                </td>
                <td
                  className={`p-3 text-right font-mono ${
                    trade.pnl_sol === null
                      ? 'text-terminal-text-dim'
                      : trade.pnl_sol >= 0
                      ? 'text-terminal-green'
                      : 'text-terminal-red'
                  }`}
                >
                  {formatPnl(trade.pnl_sol, trade.pnl_percent)}
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      trade.status === 'CONFIRMED'
                        ? 'bg-terminal-green/20 text-terminal-green'
                        : trade.status === 'PENDING'
                        ? 'bg-terminal-amber/20 text-terminal-amber'
                        : 'bg-terminal-red/20 text-terminal-red'
                    }`}
                  >
                    {trade.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {trades.length > 10 && (
        <div className="border-t border-terminal-border p-3 text-center">
          <span className="text-xs text-terminal-text-dim">
            Showing 10 of {trades.length} trades
          </span>
        </div>
      )}
    </div>
  );
}
