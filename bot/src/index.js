import { checkEnvExists, runSetup } from './setup.js';

async function main() {
    console.log('');
    console.log('  ██╗   ██╗██╗██████╗ ███████╗███████╗');
    console.log('  ██║   ██║██║██╔══██╗██╔════╝██╔════╝');
    console.log('  ██║   ██║██║██████╔╝█████╗  ███████╗');
    console.log('  ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ╚════██║');
    console.log('   ╚████╔╝ ██║██████╔╝███████╗███████║');
    console.log('    ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚══════╝');
    console.log('  ════════════════════════════════════');
    console.log('     Autonomous Trader on Solana');
    console.log('        Powered by Claude AI');
    console.log('');

    // Check if setup is needed
    if (!checkEnvExists()) {
        console.log('[INIT] Environment not configured, starting setup...');
        console.log('');
        await runSetup();
        console.log('');
        console.log('[INIT] Please restart the bot to begin trading.');
        process.exit(0);
    }

    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();

    // Import after env is loaded
    const { config, validateConfig } = await import('./config.js');

    // Validate config
    const validation = validateConfig();
    if (!validation.valid) {
        console.error('[INIT] Missing configuration:', validation.missing.join(', '));
        console.error('[INIT] Please run setup again or check your .env file');
        process.exit(1);
    }

    // Initialize services
    const { initSupabase, updateSystemStatus, updateStats, getStats } = await import('./lib/supabase.js');
    const { initSolana, getWallet, getBalance } = await import('./lib/solana.js');
    const { connectPumpPortal, onNewToken, isConnected } = await import('./lib/pumpfun.js');
    const { analyzeToken } = await import('./services/analyzer.js');
    const { executeBuy, loadOpenPositions, startPositionMonitor, setTradingMode } = await import('./services/trader.js');
    const { initThoughts, generateThought, incrementTradeCount } = await import('./services/thoughts.js');
    const { initPaperTrading } = await import('./services/paper-trading.js');
    const { initApi } = await import('./services/api.js');

    console.log('[INIT] Starting services...');
    console.log('');

    // Initialize Supabase
    try {
        initSupabase();
        console.log('[OK] Supabase connected');
    } catch (error) {
        console.error('[ERROR] Supabase connection failed:', error.message);
        process.exit(1);
    }

    // Initialize Solana
    try {
        initSolana();
        const wallet = getWallet();
        const balance = await getBalance();
        console.log(`[OK] Solana wallet: ${wallet.publicKey.toBase58()}`);
        console.log(`[OK] Balance: ${balance.toFixed(4)} SOL`);
    } catch (error) {
        console.error('[ERROR] Solana initialization failed:', error.message);
        process.exit(1);
    }

    // Initialize Paper Trading
    try {
        const paperState = await initPaperTrading();
        console.log(`[OK] Paper trading initialized: ${paperState.balance.toFixed(4)} SOL`);
        setTradingMode(true); // Start in paper mode
    } catch (error) {
        console.error('[ERROR] Paper trading init failed:', error.message);
    }

    // Initialize Thoughts (Claude AI)
    try {
        initThoughts();
        console.log('[OK] Claude AI thoughts initialized');
    } catch (error) {
        console.error('[ERROR] Thoughts init failed:', error.message);
    }

    // Load existing open positions
    await loadOpenPositions();

    // Start position monitor
    startPositionMonitor(30000); // Check every 30 seconds

    // Initialize API
    try {
        initApi();
        console.log(`[OK] API server running on port ${config.apiPort}`);
    } catch (error) {
        console.error('[ERROR] API init failed:', error.message);
        process.exit(1);
    }

    // Update system status
    const wallet = getWallet();
    const balance = await getBalance();
    await updateSystemStatus({
        wallet_address: wallet.publicKey.toBase58(),
        balance_sol: balance,
        status: 'STARTING',
        mode: 'PAPER',
        analysis_progress: 0,
    });

    // Initialize stats if not exists
    const stats = await getStats();
    if (!stats) {
        await updateStats({
            total_pnl_sol: 0,
            win_rate: 0,
            total_trades: 0,
            winning_trades: 0,
            losing_trades: 0,
            open_positions: 0,
            paper_balance: 10,
        });
    }

    console.log('');
    console.log('[INIT] Connecting to PumpPortal...');

    // Connect to PumpPortal WebSocket
    try {
        await connectPumpPortal();
        console.log('[OK] PumpPortal WebSocket connected');
    } catch (error) {
        console.error('[ERROR] PumpPortal connection failed:', error.message);
        console.log('[INFO] Will retry connection automatically...');
    }

    // Track analyzed tokens for pre-trading analysis
    let tokensAnalyzed = 0;
    const PRE_TRADING_TARGET = 100; // Analyze 100 tokens before live trading

    // Handle new tokens
    onNewToken(async (tokenData) => {
        console.log(`[NEW] Token: ${tokenData.symbol} (${tokenData.mint.slice(0, 8)}...)`);

        // Analyze the token
        const result = await analyzeToken(tokenData.mint, {
            mint: tokenData.mint,
            name: tokenData.name,
            symbol: tokenData.symbol,
            creator: tokenData.creator,
            marketCap: tokenData.marketCapSol * 150, // Rough USD estimate
        });

        if (result) {
            tokensAnalyzed++;

            // Update analysis progress
            const progress = Math.min(100, Math.round((tokensAnalyzed / PRE_TRADING_TARGET) * 100));
            await updateSystemStatus({
                status: progress >= 100 ? 'TRADING' : 'ANALYZING',
                analysis_progress: progress,
                trades_analyzed: tokensAnalyzed,
                trades_remaining: Math.max(0, PRE_TRADING_TARGET - tokensAnalyzed),
            });

            // If approved and we're past pre-trading phase, execute buy
            if (result.shouldBuy && tokensAnalyzed >= PRE_TRADING_TARGET) {
                const trade = await executeBuy(result.token, result);

                if (trade) {
                    incrementTradeCount();
                }
            }
        }
    });

    // Generate initial thought
    setTimeout(async () => {
        console.log('[THOUGHTS] Generating initial analysis...');
        await generateThought('AUTO');
    }, 5000);

    // Update status to running
    await updateSystemStatus({
        status: 'ANALYZING',
        analysis_progress: 0,
    });

    console.log('');
    console.log('════════════════════════════════════════');
    console.log('  VIBES TRADING is now running!');
    console.log('  Mode: PAPER (simulation)');
    console.log('  API: http://localhost:' + config.apiPort);
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('Waiting for new tokens...');
    console.log('');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('');
        console.log('[SHUTDOWN] Gracefully shutting down...');

        await updateSystemStatus({ status: 'OFFLINE' });

        const { stopPositionMonitor } = await import('./services/trader.js');
        const { stopApi } = await import('./services/api.js');
        const { disconnect } = await import('./lib/pumpfun.js');

        stopPositionMonitor();
        stopApi();
        disconnect();

        console.log('[SHUTDOWN] Complete. Goodbye!');
        process.exit(0);
    });
}

main().catch(error => {
    console.error('[FATAL]', error);
    process.exit(1);
});
