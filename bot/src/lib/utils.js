export function formatSol(amount) {
    if (amount === null || amount === undefined) return '0.0000';
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.0000';
    return num.toFixed(4);
}

export function formatPercent(value) {
    if (value === null || value === undefined) return '0.00%';
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

export function formatUsd(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';

    if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
        return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
}

export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    const n = parseFloat(num);
    if (isNaN(n)) return '0';

    if (n >= 1000000000) {
        return `${(n / 1000000000).toFixed(2)}B`;
    }
    if (n >= 1000000) {
        return `${(n / 1000000).toFixed(2)}M`;
    }
    if (n >= 1000) {
        return `${(n / 1000).toFixed(2)}K`;
    }
    return n.toFixed(0);
}

export function truncateAddress(address, chars = 4) {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

export function calculatePnL(entryPrice, currentPrice, amount) {
    if (!entryPrice || !currentPrice || !amount) return { pnlSol: 0, pnlPercent: 0 };

    const entryValue = entryPrice * amount;
    const currentValue = currentPrice * amount;
    const pnlSol = currentValue - entryValue;
    const pnlPercent = ((currentValue - entryValue) / entryValue) * 100;

    return { pnlSol, pnlPercent };
}

export function getTimestamp() {
    return new Date().toISOString();
}

export function getTimeAgo(timestamp) {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
}

export function logWithTimestamp(prefix, message, ...args) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${prefix}]`, message, ...args);
}

export class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async acquire() {
        const now = Date.now();
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            await sleep(waitTime);
            return this.acquire();
        }

        this.requests.push(now);
        return true;
    }
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
