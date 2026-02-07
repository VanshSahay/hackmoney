/**
 * Configuration Management
 * Loads and validates configuration from environment variables
 */

import { config as dotenvConfig } from 'dotenv';
import type { PartyConfig } from './types.js';
import type { Address, Hash } from 'viem';
import { getOrCreateWallet, type WalletInfo } from './utils/wallet.js';
import {
  parsePeerList,
  createNodeList,
  findMyNode,
  validateNodeName,
  type NodeInfo,
} from './utils/ens.js';

// Load .env file
dotenvConfig();

/**
 * Server configuration
 */
export interface Config {
  // Node identity
  nodeName: string;
  partyId: number;
  address: string;
  port: number;
  
  // Network configuration
  peers: PartyConfig[];
  allNodes: NodeInfo[];
  
  // Blockchain configuration
  rpcUrl: string;
  chainId: number;
  settlementAddress: Address;
  privateKey: Hash;
  
  // Wallet information
  wallet: WalletInfo;
  
  // Capacity configuration
  initialCapacities: Map<string, bigint>;
  
  // Uniswap configuration
  enableAutoSwap: boolean;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  // Node identity
  const nodeName = getEnv('NODE_NAME');
  validateNodeName(nodeName);
  
  // Parse peer list
  const peersString = getEnv('PEERS', '');
  const peerList = parsePeerList(peersString);
  
  // Get or set port
  const portEnv = process.env['PORT'];
  const port = portEnv && portEnv !== 'auto' 
    ? parseInt(portEnv, 10) 
    : undefined; // Will be auto-generated from node name
  
  // Create sorted node list with assigned party IDs
  const allNodes = createNodeList(nodeName, peerList, port);
  const myNode = findMyNode(allNodes, nodeName);
  
  // Blockchain configuration
  const rpcUrl = getEnv('RPC_URL', 'http://localhost:8545');
  const chainId = getEnvNumber('CHAIN_ID', 31337);
  const settlementAddress = getEnv('SETTLEMENT_ADDRESS') as Address;
  
  // Wallet management - auto-generate if not provided
  const privateKeyEnv = process.env['PRIVATE_KEY'] as Hash | undefined;
  const wallet = getOrCreateWallet(nodeName, privateKeyEnv);
  
  // Build peer configuration for MPC server
  const peers = buildPeerConfig(allNodes, myNode.partyId, wallet.address);
  
  // Initial capacities
  const initialCapacities = loadInitialCapacities();
  
  // Uniswap configuration
  const enableAutoSwap = getEnv('ENABLE_AUTO_SWAP', 'true').toLowerCase() === 'true';
  
  return {
    nodeName,
    partyId: myNode.partyId,
    address: myNode.address,
    port: myNode.port,
    peers,
    allNodes,
    rpcUrl,
    chainId,
    settlementAddress,
    privateKey: wallet.privateKey,
    wallet,
    initialCapacities,
    enableAutoSwap,
  };
}

/**
 * Build peer configuration from node list
 */
function buildPeerConfig(
  allNodes: NodeInfo[],
  myPartyId: number,
  myBlockchainAddress: Address
): PartyConfig[] {
  return allNodes.map(node => {
    const config: PartyConfig = {
      id: node.partyId,
      address: node.address,
      port: node.port,
    };
    
    // Add blockchain address (for self, use wallet address; for others, to be shared via P2P)
    if (node.partyId === myPartyId) {
      config.blockchainAddress = myBlockchainAddress;
    } else {
      // For other nodes, blockchain address will be shared during initial handshake
      // For now, we'll use a placeholder that will be updated
      config.blockchainAddress = node.blockchainAddress;
    }
    
    return config;
  });
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
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  MPC SERVER CONFIGURATION                     ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Node Name:     ${config.nodeName.padEnd(44)}║`);
  console.log(`║ Party ID:      ${config.partyId.toString().padEnd(44)}║`);
  console.log(`║ Network:       ${`${config.address}:${config.port}`.padEnd(44)}║`);
  console.log(`║ Wallet:        ${config.wallet.address.padEnd(44)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ BLOCKCHAIN                                                    ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Chain ID:      ${config.chainId.toString().padEnd(44)}║`);
  console.log(`║ RPC URL:       ${config.rpcUrl.padEnd(44)}║`);
  console.log(`║ Settlement:    ${config.settlementAddress.padEnd(44)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ NETWORK PEERS                                                 ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  
  for (const node of config.allNodes) {
    const isSelf = node.partyId === config.partyId;
    const marker = isSelf ? ' (YOU)' : '';
    const nodeStr = `Party ${node.partyId}: ${node.name}${marker}`;
    console.log(`║ ${nodeStr.padEnd(61)}║`);
  }
  
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ INITIAL CAPACITIES                                            ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  
  if (config.initialCapacities.size === 0) {
    console.log('║ (none configured)                                             ║');
  } else {
    for (const [token, amount] of config.initialCapacities.entries()) {
      const capacityStr = `${token.substring(0, 10)}...${token.slice(-8)}: ${amount}`;
      console.log(`║ ${capacityStr.padEnd(61)}║`);
    }
  }
  
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}
