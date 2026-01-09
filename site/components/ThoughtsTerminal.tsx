'use client';

import { useState } from 'react';
import { Thought, generateThought } from '@/lib/supabase';

interface ThoughtsTerminalProps {
  thoughts: Thought[];
  onRefresh: () => void;
}

export default function ThoughtsTerminal({ thoughts, onRefresh }: ThoughtsTerminalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const latestThought = thoughts[0];
  const historyThoughts = thoughts.slice(1);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    await generateThought();
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatThoughtContent = (content: string) => {
    // Split by newlines and render each line with > prefix styling
    return content.split('\n').map((line, index) => {
      const cleanLine = line.replace(/^>\s*/, '').trim();
      if (!cleanLine) return null;
      return (
        <div key={index} className="text-terminal-text text-sm font-mono mb-1">
          <span className="text-terminal-text-dim mr-2">{'>'}</span>
          {cleanLine}
        </div>
      );
    });
  };

  return (
    <div className="bg-terminal-card border border-terminal-border">
      {/* Terminal Header */}
      <div className="border-b border-terminal-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-pixel text-xs text-terminal-amber">thoughts?</h2>
          <span className="text-terminal-text-dim text-xs">
            - ai analysis
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot online" />
          <span className="text-xs text-terminal-text-dim">ready</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-4">
        {/* Command line */}
        <div className="text-terminal-green text-sm font-mono mb-4">
          <span className="text-terminal-text-dim">$</span> analyze --trades --roast
        </div>

        {/* Latest thought or placeholder */}
        <div className="min-h-[120px] mb-4">
          {latestThought ? (
            formatThoughtContent(latestThought.content)
          ) : (
            <div className="text-terminal-text-dim text-sm font-mono">
              <span className="text-terminal-text-dim mr-2">{'>'}</span>
              waiting for trades to analyze...
              <span className="animate-blink">_</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-terminal text-xs"
          >
            history ({historyThoughts.length})
          </button>
          <button
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="btn-terminal text-xs"
          >
            {isRefreshing ? 'generating...' : 'force refresh'}
          </button>
        </div>

        {/* History dropdown */}
        {showHistory && historyThoughts.length > 0 && (
          <div className="border-t border-terminal-border pt-4 mt-4">
            <div className="text-xs text-terminal-text-dim mb-2">Previous thoughts:</div>
            <div className="max-h-[200px] overflow-y-auto space-y-4">
              {historyThoughts.map((thought) => (
                <div
                  key={thought.id}
                  className="bg-terminal-bg p-3 border border-terminal-border text-xs"
                >
                  <div className="text-terminal-text-dim mb-2">
                    {new Date(thought.created_at).toLocaleString()}
                  </div>
                  {thought.content.split('\n').map((line, i) => {
                    const cleanLine = line.replace(/^>\s*/, '').trim();
                    if (!cleanLine) return null;
                    return (
                      <div key={i} className="text-terminal-text font-mono">
                        <span className="text-terminal-text-dim mr-1">{'>'}</span>
                        {cleanLine}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Terminal Footer */}
      <div className="border-t border-terminal-border p-3 flex items-center justify-between text-xs text-terminal-text-dim">
        <span>powered by claude</span>
        <span>auto-refresh every 5 trades</span>
      </div>
    </div>
  );
}
