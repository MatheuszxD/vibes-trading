import { config } from '../config.js';
import { fetchTokenData, fetchTokenHolders, fetchTokenTrades } from '../lib/pumpfun.js';
import { insertToken, updateToken, getToken } from '../lib/supabase.js';
import { sleep } from '../lib/utils.js';

export async function analyzeToken(mint, basicData = null) {
    console.log(`[ANALYZER] Analyzing token: ${mint}`);

    try {
        // Fetch complete token data
        const tokenData = basicData || await fetchTokenData(mint);
        if (!tokenData) {
            console.log(`[ANALYZER] Could not fetch data for ${mint}`);
            return null;
        }

        // Fetch holders
        const holders = await fetchTokenHolders(mint);
        await sleep(300); // Rate limiting

        // Fetch recent trades
        const trades = await fetchTokenTrades(mint, 50);

        // Calculate metrics
        const metrics = calculateMetrics(tokenData, holders, trades);

        // Calculate score
        const score = calculateScore(metrics);

        // Determine status based on score
        let status = 'REJECTED';
        if (score >= config.trading.minScoreToBuy) {
            status = 'APPROVED';
        } else if (score >= 50) {
            status = 'WATCHING';
        }

        // Save to database
        const tokenRecord = {
            mint: tokenData.mint,
            name: tokenData.name,
            symbol: tokenData.symbol,
            creator: tokenData.creator,
            initial_mcap: metrics.marketCap,
            current_mcap: metrics.marketCap,
            volume_24h: metrics.volume24h,
            holders: metrics.holderCount,
            score: score,
            status: status,
        };

        // Check if token already exists
        const existing = await getToken(mint);
        let savedToken;

        if (existing) {
            savedToken = await updateToken(mint, {
                current_mcap: metrics.marketCap,
                volume_24h: metrics.volume24h,
                holders: metrics.holderCount,
                score: score,
                status: status,
            });
        } else {
            savedToken = await insertToken(tokenRecord);
        }

        console.log(`[ANALYZER] ${tokenData.symbol}: Score ${score}/100 - ${status}`);

        return {
            token: savedToken,
            metrics,
            score,
            status,
            shouldBuy: status === 'APPROVED',
        };
    } catch (error) {
        console.error(`[ANALYZER] Error analyzing ${mint}:`, error.message);
        return null;
    }
}

function calculateMetrics(tokenData, holders, trades) {
    // Market cap (use USD or calculate from SOL reserves)
    const marketCap = tokenData.marketCap || 0;

    // Holder analysis
    const holderCount = holders.length;
    const topHolderPercent = holders.length > 0
        ? (parseFloat(holders[0]?.balance || 0) / parseFloat(tokenData.totalSupply || 1)) * 100
        : 0;
    const hasWhale = topHolderPercent > config.analysis.whaleThreshold;

    // Calculate distribution score (Gini-like)
    let distributionScore = 100;
    if (holders.length > 0) {
        const balances = holders.map(h => parseFloat(h.balance || 0));
        const totalBalance = balances.reduce((a, b) => a + b, 0);
        const avgBalance = totalBalance / balances.length;

        // Top 10% shouldn't hold more than 50%
        const top10Count = Math.ceil(holders.length * 0.1);
        const top10Balance = balances.slice(0, top10Count).reduce((a, b) => a + b, 0);
        const top10Percent = (top10Balance / totalBalance) * 100;

        if (top10Percent > 70) distributionScore = 20;
        else if (top10Percent > 50) distributionScore = 50;
        else distributionScore = 80;
    }

    // Volume analysis
    let volume24h = 0;
    let buyCount = 0;
    let sellCount = 0;
    let momentum = 0;

    if (trades.length > 0) {
        const now = Date.now();
        const last24h = now - 24 * 60 * 60 * 1000;
        const last5min = now - 5 * 60 * 1000;

        const recentTrades = trades.filter(t => new Date(t.timestamp).getTime() > last24h);
        volume24h = recentTrades.reduce((sum, t) => sum + (parseFloat(t.sol_amount) || 0), 0);

        buyCount = trades.filter(t => t.is_buy).length;
        sellCount = trades.filter(t => !t.is_buy).length;

        // Momentum: net buys in last 5 minutes
        const last5minTrades = trades.filter(t => new Date(t.timestamp).getTime() > last5min);
        const last5minBuys = last5minTrades.filter(t => t.is_buy).length;
        const last5minSells = last5minTrades.filter(t => !t.is_buy).length;
        momentum = last5minBuys - last5minSells;
    }

    // Volume ratio
    const volumeRatio = marketCap > 0 ? volume24h / marketCap : 0;

    // Buy/sell ratio
    const totalTrades = buyCount + sellCount;
    const buyRatio = totalTrades > 0 ? buyCount / totalTrades : 0.5;

    return {
        marketCap,
        holderCount,
        topHolderPercent,
        hasWhale,
        distributionScore,
        volume24h,
        volumeRatio,
        buyCount,
        sellCount,
        buyRatio,
        momentum,
        totalTrades,
    };
}

function calculateScore(metrics) {
    let score = 0;
    const c = config.analysis;

    // Market cap score (max 25 points)
    if (metrics.marketCap >= c.idealMcapMin && metrics.marketCap <= c.idealMcapMax) {
        score += 25;
    } else if (metrics.marketCap < c.idealMcapMin) {
        score += 10;
    } else if (metrics.marketCap <= c.maxMcap) {
        score += 15;
    }
    // Above maxMcap = 0 points

    // Holder score (max 25 points)
    if (metrics.holderCount >= c.greatHolders) {
        score += 25;
    } else if (metrics.holderCount >= c.goodHolders) {
        score += 15;
    } else if (metrics.holderCount >= c.minHolders) {
        score += 10;
    }
    // Below minHolders = 0 points

    // Volume ratio score (max 25 points)
    if (metrics.volumeRatio >= c.greatVolumeRatio) {
        score += 25;
    } else if (metrics.volumeRatio >= c.goodVolumeRatio) {
        score += 15;
    } else if (metrics.volumeRatio > 0) {
        score += 5;
    }

    // Distribution score (max 15 points)
    if (!metrics.hasWhale) {
        score += 15;
    } else if (metrics.topHolderPercent < 30) {
        score += 8;
    }

    // Momentum score (max 10 points)
    if (metrics.momentum > 5) {
        score += 10;
    } else if (metrics.momentum > 0) {
        score += 5;
    } else if (metrics.momentum < -5) {
        score -= 5; // Negative momentum penalty
    }

    // Buy ratio bonus (up to 5 points)
    if (metrics.buyRatio > 0.7) {
        score += 5;
    } else if (metrics.buyRatio > 0.6) {
        score += 3;
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
}

export async function batchAnalyze(mints, onProgress = null) {
    const results = [];
    let completed = 0;

    for (const mint of mints) {
        const result = await analyzeToken(mint);
        results.push(result);
        completed++;

        if (onProgress) {
            onProgress(completed, mints.length, result);
        }

        // Rate limiting
        await sleep(500);
    }

    return results;
}

export function getAnalysisSummary(metrics, score) {
    const reasons = [];

    if (score >= 70) {
        reasons.push('Strong buy signal');
    } else if (score >= 50) {
        reasons.push('Moderate potential');
    } else {
        reasons.push('Low score - skipping');
    }

    if (metrics.hasWhale) {
        reasons.push(`Whale detected (${metrics.topHolderPercent.toFixed(1)}%)`);
    }

    if (metrics.momentum > 5) {
        reasons.push('Strong positive momentum');
    } else if (metrics.momentum < -5) {
        reasons.push('Negative momentum warning');
    }

    if (metrics.holderCount < 20) {
        reasons.push('Low holder count');
    }

    return reasons.join(' | ');
}
