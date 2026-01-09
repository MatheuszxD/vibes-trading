'use client';

import { SystemStatus } from '@/lib/supabase';

interface HeaderProps {
  status: SystemStatus | null;
}

export default function Header({ status }: HeaderProps) {
  const getStatusColor = () => {
    switch (status?.status) {
      case 'TRADING':
        return 'online';
      case 'ANALYZING':
        return 'analyzing';
      default:
        return 'offline';
    }
  };

  return (
    <header className="border-b border-terminal-border bg-terminal-bg/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <h1 className="font-pixel text-terminal-green text-lg sm:text-xl tracking-wider glow-green">
              VIBES
            </h1>
            <span className="text-terminal-text-dim text-xs hidden sm:inline">
              autonomous trader on solana blockchain powered by claude
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2 sm:gap-4">
            <a
              href="#"
              className="text-terminal-green text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 border border-terminal-green/50 hover:bg-terminal-green/10 transition-colors"
            >
              [DASHBOARD]
            </a>
            <a
              href="#stats"
              className="text-terminal-text-dim text-xs sm:text-sm hover:text-terminal-text transition-colors hidden sm:inline"
            >
              [STATS]
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terminal-text-dim text-xs sm:text-sm hover:text-terminal-text transition-colors hidden sm:inline"
            >
              [DOCS]
            </a>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 ml-2 sm:ml-4 px-2 sm:px-3 py-1 bg-terminal-card rounded">
              <span className={`status-dot ${getStatusColor()}`} />
              <span className="text-xs text-terminal-text-dim uppercase">
                {status?.status || 'OFFLINE'}
              </span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
