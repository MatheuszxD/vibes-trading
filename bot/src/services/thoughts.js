import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { insertThought, getThoughts, getRecentTrades, getStats } from '../lib/supabase.js';
import { formatSol, formatPercent } from '../lib/utils.js';

let anthropic = null;
let tradesSinceLastThought = 0;

export function initThoughts() {
    anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
    });
    console.log('[THOUGHTS] Claude AI initialized');
}

export async function generateThought(trigger = 'AUTO') {
    if (!anthropic) {
        console.error('[THOUGHTS] Anthropic client not initialized');
        return null;
    }

    try {
        // Get current stats
        const stats = await getStats();
        const recentTrades = await getRecentTrades(10);

        // Format recent trades for the prompt
        const tradesText = recentTrades.map(t => {
            const side = t.side;
            const symbol = t.symbol;
            const pnl = t.pnl_sol ? `${formatSol(t.pnl_sol)} SOL (${formatPercent(t.pnl_percent)})` : 'open';
            return `${side} ${symbol}: ${pnl}`;
        }).join('\n');

        const winRate = stats?.paper_win_rate || 0;
        const pnl = stats?.paper_pnl_sol || 0;
        const totalTrades = stats?.paper_trades || 0;
        const wins = stats?.paper_wins || 0;
        const losses = stats?.paper_losses || 0;

        const prompt = `You are a degen crypto trader who speaks in internet slang and memes. You're direct and honest.
Analyze these trading stats and give a "roast" or honest commentary about the performance:

Stats:
- Win Rate: ${winRate.toFixed(1)}%
- PNL: ${formatSol(pnl)} SOL
- Total Trades: ${totalTrades}
- Wins/Losses: ${wins}w / ${losses}l

Recent Trades:
${tradesText || 'No trades yet'}

Rules:
- Use casual internet slang like "ngl", "fr", "lowkey", "deadass", "ngmi/gmi", "ser", "anon", "based", "copium"
- Be honest but constructive - point out patterns
- If losing, roast the performance but give tips
- If winning, acknowledge it but warn about getting cocky
- Maximum 5 lines, each starting with ">"
- Do NOT use emojis
- Be funny but insightful
- If no trades yet, make a joke about waiting

Example format:
> lowkey mid performance ngl, 42% wr is cute but skill issue showing
> ur hitting -20% sl way too much ser, maybe entry timing is sus
> fr tho the momentum plays were based, keep that energy
> suggestion: wait for more volume confirmation before aping
> overall verdict: ngmi unless u fix that entry timing fr`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            messages: [{ role: 'user', content: prompt }]
        });

        const thoughtContent = response.content[0].text;

        // Save to database
        const thought = await insertThought({
            content: thoughtContent,
            trigger,
            trades_count: totalTrades,
            win_rate: winRate,
            pnl_sol: pnl,
        });

        console.log('[THOUGHTS] New thought generated');
        tradesSinceLastThought = 0;

        return thought;
    } catch (error) {
        console.error('[THOUGHTS] Error generating thought:', error.message);
        return null;
    }
}

export function incrementTradeCount() {
    tradesSinceLastThought++;

    if (tradesSinceLastThought >= config.trading.thoughtsInterval) {
        generateThought('AUTO').catch(err => {
            console.error('[THOUGHTS] Auto-generate failed:', err.message);
        });
    }
}

export function getTradesSinceLastThought() {
    return tradesSinceLastThought;
}

export async function getLatestThoughts(limit = 10) {
    return await getThoughts(limit);
}

export async function forceRefresh() {
    return await generateThought('REFRESH');
}
