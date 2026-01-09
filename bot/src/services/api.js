import express from 'express';
import cors from 'cors';
import { config } from '../config.js';
import { getSystemStatus, updateSystemStatus, getStats, getTokens, getToken, getTrades, getOpenTrades } from '../lib/supabase.js';
import { getBalance, getWallet } from '../lib/solana.js';
import { analyzeToken } from './analyzer.js';
import { getOpenPositions, setTradingMode, isPaper } from './trader.js';
import { getLatestThoughts, forceRefresh } from './thoughts.js';
import { getPaperState, togglePaperMode, resetPaperTrading } from './paper-trading.js';
import { formatSol } from '../lib/utils.js';

let app = null;
let server = null;

export function initApi() {
    app = express();

    app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    // System status
    app.get('/status', async (req, res) => {
        try {
            const status = await getSystemStatus();
            const wallet = getWallet();
            const balance = await getBalance();

            res.json({
                ...status,
                wallet_address: wallet.publicKey.toBase58(),
                balance_sol: balance,
                mode: isPaper() ? 'PAPER' : 'LIVE',
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Stats
    app.get('/stats', async (req, res) => {
        try {
            const stats = await getStats();
            const paperState = getPaperState();

            res.json({
                total_pnl_sol: stats?.total_pnl_sol || 0,
                win_rate: stats?.win_rate || 0,
                total_trades: stats?.total_trades || 0,
                winning_trades: stats?.winning_trades || 0,
                losing_trades: stats?.losing_trades || 0,
                open_positions: getOpenPositions().length,
                paper: {
                    balance: paperState.balance,
                    pnl_sol: paperState.pnlSol,
                    pnl_percent: paperState.pnlPercent,
                    win_rate: paperState.wins + paperState.losses > 0
                        ? (paperState.wins / (paperState.wins + paperState.losses)) * 100
                        : 0,
                    trades: paperState.trades,
                    wins: paperState.wins,
                    losses: paperState.losses,
                    open: paperState.openPositions,
                },
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Tokens list
    app.get('/tokens', async (req, res) => {
        try {
            const { status, limit = 50 } = req.query;
            const tokens = await getTokens(parseInt(limit), status || null);
            res.json(tokens);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Single token
    app.get('/tokens/:mint', async (req, res) => {
        try {
            const token = await getToken(req.params.mint);
            if (!token) {
                return res.status(404).json({ error: 'Token not found' });
            }
            res.json(token);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Trades list
    app.get('/trades', async (req, res) => {
        try {
            const { limit = 50, paper } = req.query;
            const isPaperFilter = paper !== undefined ? paper === 'true' : null;
            const trades = await getTrades(parseInt(limit), isPaperFilter);
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Open positions
    app.get('/trades/open', async (req, res) => {
        try {
            const positions = getOpenPositions();
            res.json(positions);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Thoughts list
    app.get('/thoughts', async (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const thoughts = await getLatestThoughts(parseInt(limit));
            res.json(thoughts);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Generate new thought
    app.post('/thoughts/generate', async (req, res) => {
        try {
            const thought = await forceRefresh();
            if (!thought) {
                return res.status(500).json({ error: 'Failed to generate thought' });
            }
            res.json(thought);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Toggle mode
    app.post('/mode', async (req, res) => {
        try {
            const { paper } = req.body;

            if (typeof paper !== 'boolean') {
                return res.status(400).json({ error: 'paper must be a boolean' });
            }

            setTradingMode(paper);
            await togglePaperMode(paper);

            res.json({
                mode: paper ? 'PAPER' : 'LIVE',
                message: `Trading mode set to ${paper ? 'PAPER' : 'LIVE'}`,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Force analyze token
    app.post('/analyze/:mint', async (req, res) => {
        try {
            const result = await analyzeToken(req.params.mint);
            if (!result) {
                return res.status(500).json({ error: 'Analysis failed' });
            }
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Reset paper trading
    app.post('/paper/reset', async (req, res) => {
        try {
            const state = await resetPaperTrading();
            res.json({
                message: 'Paper trading reset',
                state,
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Start server
    server = app.listen(config.apiPort, () => {
        console.log(`[API] Server running on port ${config.apiPort}`);
    });

    return app;
}

export function getApp() {
    return app;
}

export function stopApi() {
    if (server) {
        server.close();
        console.log('[API] Server stopped');
    }
}
