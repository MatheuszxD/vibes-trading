export const config = {
    // Helius RPC
    heliusApiKey: process.env.HELIUS_API_KEY,
    rpcUrl: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,

    // Supabase
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,

    // Anthropic
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,

    // Wallet
    privateKey: process.env.PRIVATE_KEY,

    // API
    apiPort: parseInt(process.env.API_PORT || '3001'),

    // Trading Settings
    trading: {
        // Score mínimo para comprar
        minScoreToBuy: 70,

        // Valores em SOL
        buyAmountSol: 0.1,
        maxPositions: 5,

        // Take profit e Stop loss
        takeProfitPercent: 50,
        stopLossPercent: -20,

        // Paper mode inicial (10 SOL)
        paperInitialBalance: 10,

        // Intervalo para gerar thoughts (a cada N trades)
        thoughtsInterval: 5,
    },

    // Análise
    analysis: {
        // Market cap ideal
        idealMcapMin: 5000,
        idealMcapMax: 50000,
        maxMcap: 100000,

        // Holders
        minHolders: 20,
        goodHolders: 50,
        greatHolders: 100,

        // Volume ratio (volume/mcap)
        goodVolumeRatio: 0.2,
        greatVolumeRatio: 0.5,

        // Whale threshold
        whaleThreshold: 20, // % do supply
    },

    // WebSocket
    pumpPortalWsUrl: 'wss://pumpportal.fun/api/data',

    // Reconnect settings
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
};

export function validateConfig() {
    const required = [
        'heliusApiKey',
        'supabaseUrl',
        'supabaseKey',
        'anthropicApiKey'
    ];

    const missing = required.filter(key => !config[key]);

    if (missing.length > 0) {
        return { valid: false, missing };
    }

    return { valid: true, missing: [] };
}
