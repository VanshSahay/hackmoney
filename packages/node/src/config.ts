/**
 * Configuration Management
 * Loads and validates configuration from environment variables
 */

import { config as dotenvConfig } from 'dotenv';
import type { PartyConfig } from './types.js';
import type { Address, Hash } from 'viem';

// Load .env file
dotenvConfig();

/**
 * Server configuration
 */
export interface Config {
  // Server identity
  partyId: number;
  address: string;
  port: number;
  
  // Network configuration
  peers: PartyConfig[];
  
  // Blockchain configuration
  rpcUrl: string;
  chainId: number;
  hookAddress: Address;
  settlementAddress: Address;
  privateKey: Hash;
  
  // Capacity configuration
  initialCapacities: Map<string, bigint>;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  // Required environment variables
  const partyId = getEnvNumber('PARTY_ID');
  const address = getEnv('ADDRESS', 'localhost');
  const port = getEnvNumber('PORT', 3000 + partyId);
  
  // Blockchain configuration
  const rpcUrl = getEnv('RPC_URL', 'http://localhost:8545');
  const chainId = getEnvNumber('CHAIN_ID', 31337); // Default to local
  const hookAddress = getEnv('HOOK_ADDRESS') as Address;
  const settlementAddress = getEnv('SETTLEMENT_ADDRESS') as Address;
  const privateKey = getEnv('PRIVATE_KEY') as Hash;
  
  // Peer configuration
  const numParties = getEnvNumber('NUM_PARTIES', 3);
  const peers = loadPeerConfig(numParties, partyId, address, port);
  
  // Initial capacities
  const initialCapacities = loadInitialCapacities();
  
  return {
    partyId,
    address,
    port,
    peers,
    rpcUrl,
    chainId,
    hookAddress,
    settlementAddress,
    privateKey,
    initialCapacities,
  };
}

/**
 * Load peer configuration
 * Expects PEER_0_ADDRESS, PEER_0_PORT, PEER_0_BLOCKCHAIN_ADDRESS, etc.
 */
function loadPeerConfig(
  numParties: number,
  myPartyId: number,
  myAddress: string,
  myPort: number
): PartyConfig[] {
  const peers: PartyConfig[] = [];
  
  for (let i = 0; i < numParties; i++) {
    if (i === myPartyId) {
      // Add self - blockchain address will be derived from private key
      peers.push({
        id: i,
        address: myAddress,
        port: myPort,
      });
    } else {
      // Load peer from env
      const peerAddress = getEnv(`PEER_${i}_ADDRESS`, 'localhost');
      const peerPort = getEnvNumber(`PEER_${i}_PORT`, 3000 + i);
      const blockchainAddress = process.env[`PEER_${i}_BLOCKCHAIN_ADDRESS`];
      
      peers.push({
        id: i,
        address: peerAddress,
        port: peerPort,
        blockchainAddress,
      });
    }
  }
  
  return peers;
}

/**
 * Load initial capacities
 * Expects CAPACITY_TOKEN_0, CAPACITY_AMOUNT_0, etc.
 */
function loadInitialCapacities(): Map<string, bigint> {
  const capacities = new Map<string, bigint>();
  
  // Try to load up to 10 token capacities
  for (let i = 0; i < 10; i++) {
    const tokenKey = `CAPACITY_TOKEN_${i}`;
    const amountKey = `CAPACITY_AMOUNT_${i}`;
    
    if (process.env[tokenKey] && process.env[amountKey]) {
      const token = process.env[tokenKey];
      const amount = BigInt(process.env[amountKey]);
      // Normalize address to lowercase for case-insensitive lookups
      capacities.set(token.toLowerCase(), amount);
    }
  }
  
  return capacities;
}

/**
 * Get required environment variable
 */
function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get number from environment variable
 */
function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return num;
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
  // Validate party ID
  if (config.partyId < 0 || config.partyId >= config.peers.length) {
    throw new Error(`Invalid party ID: ${config.partyId}`);
  }
  
  // Validate addresses
  if (!config.hookAddress || !config.hookAddress.startsWith('0x')) {
    throw new Error('Invalid hook address');
  }
  if (!config.settlementAddress || !config.settlementAddress.startsWith('0x')) {
    throw new Error('Invalid settlement address');
  }
  
  // Validate private key
  if (!config.privateKey || !config.privateKey.startsWith('0x')) {
    throw new Error('Invalid private key');
  }
  
  // Validate RPC URL
  if (!config.rpcUrl) {
    throw new Error('Invalid RPC URL');
  }
  
  console.log('Configuration validated successfully');
}

/**
 * Print configuration (excluding sensitive data)
 */
export function printConfig(config: Config): void {
  console.log('\n=== MPC Server Configuration ===');
  console.log(`Party ID: ${config.partyId}`);
  console.log(`Address: ${config.address}:${config.port}`);
  console.log(`Chain ID: ${config.chainId}`);
  console.log(`Hook Address: ${config.hookAddress}`);
  console.log(`Settlement Address: ${config.settlementAddress}`);
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log('\nPeers:');
  for (const peer of config.peers) {
    const isSelf = peer.id === config.partyId ? ' (self)' : '';
    console.log(`  Party ${peer.id}: ${peer.address}:${peer.port}${isSelf}`);
  }
  console.log('\nInitial Capacities:');
  if (config.initialCapacities.size === 0) {
    console.log('  (none configured)');
  } else {
    for (const [token, amount] of config.initialCapacities.entries()) {
      console.log(`  ${token}: ${amount}`);
    }
  }
  console.log('================================\n');
}
