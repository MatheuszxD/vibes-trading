import { config } from '../config.js';
import { getConnection, getWallet, getBalance } from '../lib/solana.js';
import { insertTrade, updateTrade, getOpenTrades, updateStats, getStats } from '../lib/supabase.js';
import { fetchTokenData } from '../lib/pumpfun.js';
import { sleep, formatSol } from '../lib/utils.js';

// Trade state
let isPaperMode = true;
let openPositions = new Map();

export function setTradingMode(paper) {
    isPaperMode = paper;
    console.log(`[TRADER] Mode set to: ${paper ? 'PAPER' : 'LIVE'}`);
}

export function isPaper() {
    return isPaperMode;
}

export async function executeBuy(token, analysisResult) {
    const { mint, symbol, name } = token;

    console.log(`[TRADER] Executing ${isPaperMode ? 'PAPER' : 'LIVE'} BUY for ${symbol}`);

    try {
        // Check if we already have a position
        if (openPositions.has(mint)) {
            console.log(`[TRADER] Already have position in ${symbol}`);
            return null;
        }

        // Check max positions
        if (openPositions.size >= config.trading.maxPositions) {
            console.log(`[TRADER] Max positions (${config.trading.maxPositions}) reached`);
            return null;
        }

        const buyAmountSol = config.trading.buyAmountSol;

        // Get current price (SOL per token)
        const tokenData = await fetchTokenData(mint);
        if (!tokenData) {
            console.log(`[TRADER] Could not fetch current price for ${symbol}`);
            return null;
        }

        // Calculate price from bonding curve
        const vSol = parseFloat(tokenData.virtualSolReserves) / 1e9;
        const vTokens = parseFloat(tokenData.virtualTokenReserves) / 1e9;
        const pricePerToken = vSol / vTokens;
        const tokensReceived = buyAmountSol / pricePerToken;

        // Get USD price estimate
        const priceUsd = (tokenData.marketCap / vTokens) || 0;

        let signature = null;

        if (isPaperMode) {
            // Paper trade - just simulate
            signature = `PAPER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Update paper balance
            const stats = await getStats();
            const newBalance = parseFloat(stats.paper_balance) - buyAmountSol;
            await updateStats({
                paper_balance: newBalance,
                paper_trades: stats.paper_trades + 1,
                paper_open: stats.paper_open + 1,
            });
        } else {
            // Live trade - would execute on-chain
            // For now, just simulate as we'd need Jupiter/Raydium integration
            console.log(`[TRADER] LIVE trading not implemented yet - would buy ${buyAmountSol} SOL of ${symbol}`);
            return null;
        }

        // Record the trade
        const trade = await insertTrade({
            token_id: token.id,
            mint,
            symbol,
            side: 'BUY',
            amount_sol: buyAmountSol,
            amount_tokens: tokensReceived,
            price_sol: pricePerToken,
            price_usd: priceUsd,
            is_paper: isPaperMode,
            signature,
            status: 'CONFIRMED',
        });

        // Track position
        openPositions.set(mint, {
            trade,
            entryPrice: pricePerToken,
            tokensHeld: tokensReceived,
            entryTime: Date.now(),
        });

        console.log(`[TRADER] BUY ${symbol}: ${formatSol(buyAmountSol)} SOL @ ${pricePerToken.toExponential(4)} SOL/token`);

        return trade;
    } catch (error) {
        console.error(`[TRADER] Buy error for ${symbol}:`, error.message);
        return null;
    }
}

export async function executeSell(mint, reason = 'MANUAL') {
    const position = openPositions.get(mint);
    if (!position) {
        console.log(`[TRADER] No open position for ${mint}`);
        return null;
    }

    const { trade: buyTrade, entryPrice, tokensHeld } = position;

    console.log(`[TRADER] Executing ${isPaperMode ? 'PAPER' : 'LIVE'} SELL for ${buyTrade.symbol} (${reason})`);

    try {
        // Get current price
        const tokenData = await fetchTokenData(mint);
        if (!tokenData) {
            console.log(`[TRADER] Could not fetch current price for ${mint}`);
            return null;
        }

        const vSol = parseFloat(tokenData.virtualSolReserves) / 1e9;
        const vTokens = parseFloat(tokenData.virtualTokenReserves) / 1e9;
        const currentPrice = vSol / vTokens;
        const priceUsd = (tokenData.marketCap / vTokens) || 0;

        // Calculate SOL received
        const solReceived = tokensHeld * currentPrice;

        // Calculate PNL
        const entrySol = buyTrade.amount_sol;
        const pnlSol = solReceived - entrySol;
        const pnlPercent = ((solReceived - entrySol) / entrySol) * 100;

        let signature = null;

        if (isPaperMode) {
            signature = `PAPER_SELL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Update paper balance and stats
            const stats = await getStats();
            const newBalance = parseFloat(stats.paper_balance) + solReceived;
            const isWin = pnlSol > 0;

            await updateStats({
                paper_balance: newBalance,
                paper_pnl_sol: parseFloat(stats.paper_pnl_sol) + pnlSol,
                paper_pnl_percent: ((newBalance - config.trading.paperInitialBalance) / config.trading.paperInitialBalance) * 100,
                paper_wins: stats.paper_wins + (isWin ? 1 : 0),
                paper_losses: stats.paper_losses + (isWin ? 0 : 1),
                paper_open: Math.max(0, stats.paper_open - 1),
                paper_win_rate: ((stats.paper_wins + (isWin ? 1 : 0)) / (stats.paper_wins + stats.paper_losses + 1)) * 100,
            });
        } else {
            // Live trade
            console.log(`[TRADER] LIVE sell not implemented`);
            return null;
        }

        // Record the sell trade
        const sellTrade = await insertTrade({
            token_id: buyTrade.token_id,
            mint,
            symbol: buyTrade.symbol,
            side: 'SELL',
            amount_sol: solReceived,
            amount_tokens: tokensHeld,
            price_sol: currentPrice,
            price_usd: priceUsd,
            pnl_sol: pnlSol,
            pnl_percent: pnlPercent,
            is_paper: isPaperMode,
            signature,
            status: 'CONFIRMED',
        });

        // Update original buy trade with PNL
        await updateTrade(buyTrade.id, {
            pnl_sol: pnlSol,
            pnl_percent: pnlPercent,
        });

        // Remove from open positions
        openPositions.delete(mint);

        console.log(`[TRADER] SELL ${buyTrade.symbol}: ${formatSol(solReceived)} SOL | PNL: ${formatSol(pnlSol)} SOL (${pnlPercent.toFixed(2)}%)`);

        return sellTrade;
    } catch (error) {
        console.error(`[TRADER] Sell error:`, error.message);
        return null;
    }
}

export async function checkPositions() {
    for (const [mint, position] of openPositions) {
        try {
            const tokenData = await fetchTokenData(mint);
            if (!tokenData) continue;

            const vSol = parseFloat(tokenData.virtualSolReserves) / 1e9;
            const vTokens = parseFloat(tokenData.virtualTokenReserves) / 1e9;
            const currentPrice = vSol / vTokens;

            const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

            // Check take profit
            if (pnlPercent >= config.trading.takeProfitPercent) {
                console.log(`[TRADER] Take profit triggered for ${position.trade.symbol} (+${pnlPercent.toFixed(2)}%)`);
                await executeSell(mint, 'TAKE_PROFIT');
                continue;
            }

            // Check stop loss
            if (pnlPercent <= config.trading.stopLossPercent) {
                console.log(`[TRADER] Stop loss triggered for ${position.trade.symbol} (${pnlPercent.toFixed(2)}%)`);
                await executeSell(mint, 'STOP_LOSS');
                continue;
            }

            // Log position update
            console.log(`[TRADER] ${position.trade.symbol}: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);

        } catch (error) {
            console.error(`[TRADER] Error checking position ${mint}:`, error.message);
        }

        await sleep(200); // Rate limiting
    }
}

export function getOpenPositions() {
    return Array.from(openPositions.entries()).map(([mint, pos]) => ({
        mint,
        symbol: pos.trade.symbol,
        entryPrice: pos.entryPrice,
        tokensHeld: pos.tokensHeld,
        entryTime: pos.entryTime,
    }));
}

export function getPositionCount() {
    return openPositions.size;
}

export async function loadOpenPositions() {
    try {
        const trades = await getOpenTrades(isPaperMode);

        for (const trade of trades) {
            openPositions.set(trade.mint, {
                trade,
                entryPrice: parseFloat(trade.price_sol),
                tokensHeld: parseFloat(trade.amount_tokens),
                entryTime: new Date(trade.created_at).getTime(),
            });
        }

        console.log(`[TRADER] Loaded ${openPositions.size} open positions`);
    } catch (error) {
        console.error('[TRADER] Error loading open positions:', error.message);
    }
}

// Position monitoring interval
let monitorInterval = null;

export function startPositionMonitor(intervalMs = 30000) {
    if (monitorInterval) {
        clearInterval(monitorInterval);
    }

    monitorInterval = setInterval(async () => {
        if (openPositions.size > 0) {
            await checkPositions();
        }
    }, intervalMs);

    console.log(`[TRADER] Position monitor started (${intervalMs / 1000}s interval)`);
}

export function stopPositionMonitor() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
        console.log('[TRADER] Position monitor stopped');
    }
}
