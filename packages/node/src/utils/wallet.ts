/**
 * Wallet Management Utilities
 * Auto-generates and persists wallets for each node
 */

import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import type { Address, Hash } from 'viem';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Wallet information
 */
export interface WalletInfo {
  address: Address;
  privateKey: Hash;
  nodeName: string;
}

/**
 * Get the wallet directory path
 */
function getWalletDir(): string {
  const dir = join(homedir(), '.mpc-node', 'wallets');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get wallet file path for a node
 */
function getWalletPath(nodeName: string): string {
  // Sanitize node name for filename
  const safeName = nodeName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return join(getWalletDir(), `${safeName}.json`);
}

/**
 * Generate a new wallet for a node
 */
export function generateWallet(nodeName: string): WalletInfo {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  const wallet: WalletInfo = {
    address: account.address,
    privateKey,
    nodeName,
  };
  
  return wallet;
}

/**
 * Save wallet to disk
 */
function saveWallet(wallet: WalletInfo): void {
  const walletPath = getWalletPath(wallet.nodeName);
  const data = JSON.stringify({
    address: wallet.address,
    privateKey: wallet.privateKey,
    nodeName: wallet.nodeName,
    createdAt: new Date().toISOString(),
  }, null, 2);
  
  writeFileSync(walletPath, data, { mode: 0o600 }); // Owner read/write only
  console.log(`💾 Wallet saved to: ${walletPath}`);
}

/**
 * Load wallet from disk
 */
function loadWallet(nodeName: string): WalletInfo | null {
  const walletPath = getWalletPath(nodeName);
  
  if (!existsSync(walletPath)) {
    return null;
  }
  
  try {
    const data = readFileSync(walletPath, 'utf-8');
    const parsed = JSON.parse(data);
    
    return {
      address: parsed.address,
      privateKey: parsed.privateKey,
      nodeName: parsed.nodeName,
    };
  } catch (error) {
    console.error(`Error loading wallet from ${walletPath}:`, error);
    return null;
  }
}

/**
 * Get or create wallet for a node
 * If a private key is provided, use it. Otherwise, load from disk or generate new.
 */
export function getOrCreateWallet(nodeName: string, privateKey?: Hash): WalletInfo {
  // If private key provided, use it
  if (privateKey) {
    const account = privateKeyToAccount(privateKey);
    console.log(`🔑 Using provided private key for ${nodeName}`);
    return {
      address: account.address,
      privateKey,
      nodeName,
    };
  }
  
  // Try to load existing wallet
  const existingWallet = loadWallet(nodeName);
  if (existingWallet) {
    console.log(`📂 Loaded existing wallet for ${nodeName}`);
    return existingWallet;
  }
  
  // Generate new wallet
  console.log(`🎲 Generating new wallet for ${nodeName}`);
  const newWallet = generateWallet(nodeName);
  saveWallet(newWallet);
  
  return newWallet;
}

/**
 * Display wallet information
 */
export function displayWalletInfo(wallet: WalletInfo): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                       WALLET INFORMATION                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Node Name:     ${wallet.nodeName.padEnd(44)}║`);
  console.log(`║ Address:       ${wallet.address.padEnd(44)}║`);
  console.log(`║ Private Key:   ${wallet.privateKey.substring(0, 20)}...${wallet.privateKey.slice(-20).padEnd(24)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log('⚠️  Keep your private key secure! Anyone with access can control your funds.\n');
}
