import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from '../config.js';

let connection = null;
let wallet = null;

export function initSolana() {
    connection = new Connection(config.rpcUrl, 'confirmed');

    if (config.privateKey) {
        try {
            const secretKey = bs58.decode(config.privateKey);
            wallet = Keypair.fromSecretKey(secretKey);
            console.log(`[SOLANA] Wallet loaded: ${wallet.publicKey.toBase58()}`);
        } catch (error) {
            console.error('[SOLANA] Invalid private key, generating new wallet...');
            wallet = Keypair.generate();
            console.log(`[SOLANA] New wallet generated: ${wallet.publicKey.toBase58()}`);
            console.log(`[SOLANA] Private key: ${bs58.encode(wallet.secretKey)}`);
        }
    } else {
        wallet = Keypair.generate();
        console.log(`[SOLANA] New wallet generated: ${wallet.publicKey.toBase58()}`);
        console.log(`[SOLANA] Private key: ${bs58.encode(wallet.secretKey)}`);
    }

    return { connection, wallet };
}

export function getConnection() {
    if (!connection) {
        throw new Error('Solana connection not initialized. Call initSolana() first.');
    }
    return connection;
}

export function getWallet() {
    if (!wallet) {
        throw new Error('Wallet not initialized. Call initSolana() first.');
    }
    return wallet;
}

export async function getBalance() {
    const conn = getConnection();
    const w = getWallet();

    try {
        const balance = await conn.getBalance(w.publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('[SOLANA] Error getting balance:', error.message);
        return 0;
    }
}

export async function getTokenBalance(mintAddress) {
    const conn = getConnection();
    const w = getWallet();

    try {
        const mint = new PublicKey(mintAddress);
        const tokenAccounts = await conn.getTokenAccountsByOwner(w.publicKey, { mint });

        if (tokenAccounts.value.length === 0) {
            return 0;
        }

        const accountInfo = await conn.getParsedAccountInfo(tokenAccounts.value[0].pubkey);
        return accountInfo.value?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    } catch (error) {
        console.error('[SOLANA] Error getting token balance:', error.message);
        return 0;
    }
}

export async function getTokenInfo(mintAddress) {
    const conn = getConnection();

    try {
        const mint = new PublicKey(mintAddress);
        const accountInfo = await conn.getParsedAccountInfo(mint);

        if (!accountInfo.value) {
            return null;
        }

        const data = accountInfo.value.data?.parsed?.info;
        return {
            supply: data?.supply,
            decimals: data?.decimals,
        };
    } catch (error) {
        console.error('[SOLANA] Error getting token info:', error.message);
        return null;
    }
}

export async function getRecentBlockhash() {
    const conn = getConnection();
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
    return { blockhash, lastValidBlockHeight };
}

export function isValidPublicKey(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}
