import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VIBES Trading | Autonomous Solana Trader',
  description: 'Autonomous trading bot on Solana blockchain powered by Claude AI',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg min-h-screen antialiased">
        <div className="scanlines">{children}</div>
      </body>
    </html>
  );
}
