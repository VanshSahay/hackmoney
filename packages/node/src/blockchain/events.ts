/**
 * Blockchain Event Listener
 * Listens for IntentCreated events from Settlement contract
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Address,
  type Hash,
  parseAbiItem,
  type Chain,
} from 'viem';
import { mainnet, sepolia, hardhat } from 'viem/chains';
import type { Intent, IntentId } from '../types.js';

/**
 * Intent event from the Settlement contract
 */
export interface IntentCreatedEvent {
  intentId: IntentId;
  user: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline: bigint;
  blockNumber: bigint;
  transactionHash: Hash;
}

export type IntentEventHandler = (event: IntentCreatedEvent) => void | Promise<void>;

/**
 * Blockchain Event Listener
 */
export class BlockchainEventListener {
  private publicClient: PublicClient;
  private settlementAddress: Address;
  private eventHandlers: IntentEventHandler[] = [];
  private isListening = false;
  private unwatch?: () => void;
  private chain: Chain;
  
  constructor(
    rpcUrl: string,
    settlementAddress: Address,
    chainId: number = 1
  ) {
    this.chain = this.getChain(chainId);
    
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    }) as any;
    
    this.settlementAddress = settlementAddress;
  }
  
  /**
   * Get chain configuration by ID
   */
  private getChain(chainId: number): Chain {
    switch (chainId) {
      case 1:
        return mainnet;
      case 11155111:
        return sepolia;
      case 31337:
        return hardhat;
      default:
        return {
          id: chainId,
          name: 'Custom Chain',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [] },
            public: { http: [] },
          },
        } as Chain;
    }
  }
  
  /**
   * Start listening for IntentCreated events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('Already listening for events');
      return;
    }
    
    console.log(`Starting to listen for IntentCreated events at ${this.settlementAddress}`);
    
    // Watch for IntentCreated events
    this.unwatch = this.publicClient.watchEvent({
      address: this.settlementAddress,
      event: parseAbiItem(
        'event IntentCreated(bytes32 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)'
      ),
      onLogs: async (logs) => {
        for (const log of logs) {
          try {
            await this.handleIntentCreated(log);
          } catch (error) {
            console.error('Error handling IntentCreated event:', error);
          }
        }
      },
    });
    
    this.isListening = true;
    console.log('Event listener started');
  }
  
  /**
   * Handle an IntentCreated event
   */
  private async handleIntentCreated(log: any): Promise<void> {
    const { args, blockNumber, transactionHash } = log;
    
    const event: IntentCreatedEvent = {
      intentId: args.intentId as Hash,
      user: args.user as Address,
      tokenIn: args.tokenIn as Address,
      tokenOut: args.tokenOut as Address,
      amountIn: args.amountIn,
      minAmountOut: args.minAmountOut,
      deadline: args.deadline,
      blockNumber,
      transactionHash,
    };
    
    console.log('IntentCreated event:', {
      intentId: event.intentId,
      user: event.user,
      amountIn: event.amountIn.toString(),
    });
    
    // Notify all handlers
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Error in intent event handler:', error);
      }
    }
  }
  
  /**
   * Register a handler for IntentCreated events
   */
  onIntentCreated(handler: IntentEventHandler): void {
    this.eventHandlers.push(handler);
  }
  
  /**
   * Stop listening for events
   */
  stopListening(): void {
    if (this.unwatch) {
      this.unwatch();
      this.unwatch = undefined;
    }
    this.isListening = false;
    console.log('Event listener stopped');
  }
  
  /**
   * Get the current block number
   */
  async getCurrentBlock(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }
  
  /**
   * Fetch historical IntentCreated events
   */
  async fetchHistoricalIntents(
    fromBlock: bigint,
    toBlock?: bigint
  ): Promise<IntentCreatedEvent[]> {
    const logs = await this.publicClient.getLogs({
      address: this.settlementAddress,
      event: parseAbiItem(
        'event IntentCreated(bytes32 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)'
      ),
      fromBlock,
      toBlock: toBlock || 'latest',
    });
    
    return logs.map((log) => ({
      intentId: log.args.intentId as Hash,
      user: log.args.user as Address,
      tokenIn: log.args.tokenIn as Address,
      tokenOut: log.args.tokenOut as Address,
      amountIn: log.args.amountIn as bigint,
      minAmountOut: log.args.minAmountOut as bigint,
      deadline: log.args.deadline as bigint,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    }));
  }
}

/**
 * Convert IntentCreatedEvent to Intent type
 */
export function eventToIntent(event: IntentCreatedEvent): Intent {
  return {
    id: event.intentId,
    tokenIn: event.tokenIn,
    tokenOut: event.tokenOut,
    amountIn: event.amountIn,
    minAmountOut: event.minAmountOut,
    user: event.user,
    deadline: event.deadline,
    timestamp: Date.now(),
    status: 'pending',
  };
}
