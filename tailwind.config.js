/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'terminal-bg': '#0a0a0a',
        'terminal-green': '#00ff00',
        'terminal-green-dim': '#22c55e',
        'terminal-amber': '#f59e0b',
        'terminal-yellow': '#eab308',
        'terminal-red': '#ef4444',
        'terminal-text': '#ededed',
        'terminal-text-dim': '#a1a1aa',
        'terminal-card': '#18181b',
        'terminal-card-hover': '#27272a',
        'terminal-border': '#3f3f46',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'terminal': ['"JetBrains Mono"', '"Fira Code"', '"Space Mono"', 'monospace'],
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'pulse-glow': {
          '0%, 100%': {
            textShadow: '0 0 5px currentColor, 0 0 10px currentColor',
            opacity: '1'
          },
          '50%': {
            textShadow: '0 0 20px currentColor, 0 0 30px currentColor',
            opacity: '0.8'
          },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        'glow-green': '0 0 10px #22c55e, 0 0 20px #22c55e40',
        'glow-red': '0 0 10px #ef4444, 0 0 20px #ef444440',
        'glow-amber': '0 0 10px #f59e0b, 0 0 20px #f59e0b40',
      },
    },
  },
  plugins: [],
}
