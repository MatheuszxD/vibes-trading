import { config } from '../config.js';
import { getStats, updateStats, updateSystemStatus } from '../lib/supabase.js';

let paperState = {
    balance: config.trading.paperInitialBalance,
    pnlSol: 0,
    pnlPercent: 0,
    trades: 0,
    wins: 0,
    losses: 0,
    openPositions: 0,
    isActive: true,
};

export async function initPaperTrading() {
    try {
        const stats = await getStats();

        if (stats) {
            paperState = {
                balance: parseFloat(stats.paper_balance) || config.trading.paperInitialBalance,
                pnlSol: parseFloat(stats.paper_pnl_sol) || 0,
                pnlPercent: parseFloat(stats.paper_pnl_percent) || 0,
                trades: stats.paper_trades || 0,
                wins: stats.paper_wins || 0,
                losses: stats.paper_losses || 0,
                openPositions: stats.paper_open || 0,
                isActive: true,
            };
            console.log(`[PAPER] Loaded state: ${paperState.balance.toFixed(4)} SOL balance`);
        } else {
            // Initialize with defaults
            await updateStats({
                paper_balance: config.trading.paperInitialBalance,
                paper_pnl_sol: 0,
                paper_pnl_percent: 0,
                paper_win_rate: 0,
                paper_trades: 0,
                paper_wins: 0,
                paper_losses: 0,
                paper_open: 0,
            });
            console.log('[PAPER] Initialized with 10 SOL');
        }

        return paperState;
    } catch (error) {
        console.error('[PAPER] Init error:', error.message);
        return paperState;
    }
}

export function getPaperState() {
    return { ...paperState };
}

export async function resetPaperTrading() {
    paperState = {
        balance: config.trading.paperInitialBalance,
        pnlSol: 0,
        pnlPercent: 0,
        trades: 0,
        wins: 0,
        losses: 0,
        openPositions: 0,
        isActive: true,
    };

    await updateStats({
        paper_balance: config.trading.paperInitialBalance,
        paper_pnl_sol: 0,
        paper_pnl_percent: 0,
        paper_win_rate: 0,
        paper_trades: 0,
        paper_wins: 0,
        paper_losses: 0,
        paper_open: 0,
    });

    console.log('[PAPER] Reset to initial state (10 SOL)');
    return paperState;
}

export async function deductBalance(amount) {
    paperState.balance -= amount;
    paperState.trades++;
    paperState.openPositions++;

    await updateStats({
        paper_balance: paperState.balance,
        paper_trades: paperState.trades,
        paper_open: paperState.openPositions,
    });

    return paperState.balance;
}

export async function addBalance(amount, pnl) {
    paperState.balance += amount;
    paperState.pnlSol += pnl;
    paperState.pnlPercent = ((paperState.balance - config.trading.paperInitialBalance) / config.trading.paperInitialBalance) * 100;
    paperState.openPositions = Math.max(0, paperState.openPositions - 1);

    if (pnl > 0) {
        paperState.wins++;
    } else {
        paperState.losses++;
    }

    const winRate = paperState.wins + paperState.losses > 0
        ? (paperState.wins / (paperState.wins + paperState.losses)) * 100
        : 0;

    await updateStats({
        paper_balance: paperState.balance,
        paper_pnl_sol: paperState.pnlSol,
        paper_pnl_percent: paperState.pnlPercent,
        paper_wins: paperState.wins,
        paper_losses: paperState.losses,
        paper_win_rate: winRate,
        paper_open: paperState.openPositions,
    });

    return paperState.balance;
}

export function canAfford(amount) {
    return paperState.balance >= amount;
}

export function hasCapacity() {
    return paperState.openPositions < config.trading.maxPositions;
}

export async function togglePaperMode(enabled) {
    paperState.isActive = enabled;

    await updateSystemStatus({
        mode: enabled ? 'PAPER' : 'LIVE',
    });

    console.log(`[PAPER] Mode ${enabled ? 'enabled' : 'disabled'}`);
    return enabled;
}
