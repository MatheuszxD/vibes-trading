'use client';

import { SystemStatus } from '@/lib/supabase';

interface PreTradingAnalysisProps {
  status: SystemStatus | null;
}

export default function PreTradingAnalysis({ status }: PreTradingAnalysisProps) {
  const progress = status?.analysis_progress || 0;
  const isComplete = progress >= 100;
  const tradesAnalyzed = status?.trades_analyzed || 0;
  const tradesRemaining = status?.trades_remaining || 0;

  const statusText = isComplete ? 'COMPLETE' : 'PROCESSING';
  const statusColor = isComplete ? 'text-terminal-green' : 'text-terminal-amber';

  return (
    <div className="bg-terminal-card border border-terminal-border p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-xs text-terminal-text">
          PRE-TRADING ANALYSIS
        </h2>
        <span className={`text-xs font-mono ${statusColor} animate-pulse`}>
          [{statusText}]
        </span>
      </div>

      {/* Loading text */}
      <div className="mb-4">
        <p className="text-terminal-text-dim text-sm font-mono">
          {isComplete
            ? 'Analysis complete. Trading mode active.'
            : 'Loading historical market data...'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex justify-between mb-4">
        {[0, 25, 50, 75, 100].map((step) => (
          <div
            key={step}
            className={`text-xs font-mono ${
              progress >= step ? 'text-terminal-green' : 'text-terminal-text-dim'
            }`}
          >
            {step}%
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex justify-between text-xs border-t border-terminal-border pt-4">
        <div className="text-terminal-text-dim">
          <span className="text-terminal-amber font-mono">{tradesRemaining}</span> trades remaining
        </div>
        <div className="text-terminal-text-dim">
          <span className="text-terminal-green font-mono">{tradesAnalyzed}</span> trades analyzed
        </div>
      </div>

      {/* Note */}
      {!isComplete && (
        <div className="mt-4 text-xs text-terminal-text-dim italic">
          * on-chain trading will begin once analysis reaches 100%
        </div>
      )}
    </div>
  );
}
