import WebSocket from 'ws';
import { config } from '../config.js';

let ws = null;
let reconnectAttempts = 0;
let isConnecting = false;
let messageHandlers = [];

export function onNewToken(callback) {
    messageHandlers.push(callback);
}

export function connectPumpPortal() {
    return new Promise((resolve, reject) => {
        if (isConnecting) {
            return reject(new Error('Already connecting'));
        }

        isConnecting = true;

        try {
            ws = new WebSocket(config.pumpPortalWsUrl);

            ws.on('open', () => {
                console.log('[PUMPPORTAL] Connected to WebSocket');
                reconnectAttempts = 0;
                isConnecting = false;

                // Subscribe to new token events
                ws.send(JSON.stringify({
                    method: 'subscribeNewToken'
                }));

                resolve(ws);
            });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());

                    // Handle new token creation
                    if (message.txType === 'create' || message.mint) {
                        const tokenData = {
                            mint: message.mint,
                            name: message.name || 'Unknown',
                            symbol: message.symbol || 'UNK',
                            creator: message.traderPublicKey || message.creator,
                            initialBuy: message.initialBuy || 0,
                            marketCapSol: message.marketCapSol || 0,
                            vSolInBondingCurve: message.vSolInBondingCurve || 0,
                            vTokensInBondingCurve: message.vTokensInBondingCurve || 0,
                            signature: message.signature,
                            timestamp: Date.now()
                        };

                        // Notify all handlers
                        messageHandlers.forEach(handler => {
                            try {
                                handler(tokenData);
                            } catch (err) {
                                console.error('[PUMPPORTAL] Handler error:', err.message);
                            }
                        });
                    }

                    // Handle trade events
                    if (message.txType === 'buy' || message.txType === 'sell') {
                        // Could be used for monitoring trades on tokens
                    }
                } catch (error) {
                    // Ignore non-JSON messages
                }
            });

            ws.on('close', (code, reason) => {
                console.log(`[PUMPPORTAL] Connection closed: ${code} - ${reason || 'No reason'}`);
                isConnecting = false;
                handleReconnect();
            });

            ws.on('error', (error) => {
                console.error('[PUMPPORTAL] WebSocket error:', error.message);
                isConnecting = false;
            });

        } catch (error) {
            isConnecting = false;
            reject(error);
        }
    });
}

function handleReconnect() {
    if (reconnectAttempts >= config.maxReconnectAttempts) {
        console.error('[PUMPPORTAL] Max reconnect attempts reached');
        return;
    }

    reconnectAttempts++;
    const delay = config.reconnectDelay * reconnectAttempts;

    console.log(`[PUMPPORTAL] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts}/${config.maxReconnectAttempts})`);

    setTimeout(() => {
        connectPumpPortal().catch(err => {
            console.error('[PUMPPORTAL] Reconnect failed:', err.message);
        });
    }, delay);
}

export function subscribeToToken(mint) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[PUMPPORTAL] Cannot subscribe: WebSocket not connected');
        return false;
    }

    ws.send(JSON.stringify({
        method: 'subscribeTokenTrade',
        keys: [mint]
    }));

    console.log(`[PUMPPORTAL] Subscribed to trades for ${mint}`);
    return true;
}

export function unsubscribeFromToken(mint) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return false;
    }

    ws.send(JSON.stringify({
        method: 'unsubscribeTokenTrade',
        keys: [mint]
    }));

    return true;
}

export function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
}

export function disconnect() {
    if (ws) {
        ws.close();
        ws = null;
    }
    messageHandlers = [];
}

// Fetch token data from PumpPortal API
export async function fetchTokenData(mint) {
    try {
        const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
            mint: data.mint,
            name: data.name,
            symbol: data.symbol,
            description: data.description,
            image: data.image_uri,
            creator: data.creator,
            marketCap: data.usd_market_cap || 0,
            website: data.website,
            twitter: data.twitter,
            telegram: data.telegram,
            complete: data.complete,
            kingOfTheHillTimestamp: data.king_of_the_hill_timestamp,
            createdTimestamp: data.created_timestamp,
            raydiumPool: data.raydium_pool,
            totalSupply: data.total_supply,
            virtualSolReserves: data.virtual_sol_reserves,
            virtualTokenReserves: data.virtual_token_reserves,
            bondingCurve: data.bonding_curve,
            associatedBondingCurve: data.associated_bonding_curve,
        };
    } catch (error) {
        console.error(`[PUMPPORTAL] Error fetching token ${mint}:`, error.message);
        return null;
    }
}

// Fetch holders for a token
export async function fetchTokenHolders(mint) {
    try {
        const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}/holders?limit=100&offset=0`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const holders = await response.json();
        return holders || [];
    } catch (error) {
        console.error(`[PUMPPORTAL] Error fetching holders for ${mint}:`, error.message);
        return [];
    }
}

// Fetch recent trades for a token
export async function fetchTokenTrades(mint, limit = 50) {
    try {
        const response = await fetch(`https://frontend-api.pump.fun/trades/latest?mint=${mint}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const trades = await response.json();
        return trades || [];
    } catch (error) {
        console.error(`[PUMPPORTAL] Error fetching trades for ${mint}:`, error.message);
        return [];
    }
}
