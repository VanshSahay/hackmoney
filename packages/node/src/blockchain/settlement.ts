/**
 * Settlement Contract Interface
 * Handles on-chain settlement of fulfilled intents
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type PrivateKeyAccount,
  parseAbi,
  type Chain,
} from 'viem';
import { mainnet, sepolia, hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { IntentId, Allocation, SettlementSignature } from '../types.js';

type SettlementManagerConfig = {
  rpcUrl: string;
  privateKey: Hash;
  settlementAddress: Address;
  partyAddresses: Map<number, Address>;
  chainId?: number;
};

/**
 * Settlement contract ABI - matches Settlement.sol
 */
const SETTLEMENT_ABI = parseAbi([
  // View functions
  'function getIntentStatus(bytes32 intentId) external view returns (uint8)',
  'function isNodeRegistered(address node) external view returns (bool)',
  'function getRegisteredNodes() external view returns (address[])',
  'function getNodeCount() external view returns (uint256)',
  // Write functions
  'function batchFillIntent(bytes32 intentId, address[] calldata nodes, uint256[] calldata amounts, bytes[] calldata signatures) external',
  'function registerNode(address node) external',
  // Events
  'event IntentCreated(bytes32 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)',
  'event IntentFilled(bytes32 indexed intentId, uint256 totalAmountOut, uint256 numNodes)',
  'event NodeRegistered(address indexed node)',
]);

/**
 * Settlement Manager
 * Coordinates on-chain settlement of intents
 */
export class SettlementManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: PrivateKeyAccount;
  private settlementAddress: Address;
  private chain: Chain;
  private partyAddresses: Map<number, Address>;
  
  constructor({
    rpcUrl,
    privateKey,
    settlementAddress,
    partyAddresses,
    chainId = 1,
  }: SettlementManagerConfig) {
    if (!(partyAddresses instanceof Map)) {
      throw new Error('SettlementManager requires partyAddresses Map');
    }

    this.account = privateKeyToAccount(privateKey);
    this.partyAddresses = partyAddresses;
    
    // Select chain based on chainId
    this.chain = this.getChain(chainId);
    
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    }) as any;
    
    this.walletClient = createWalletClient({
      account: this.account,
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
        // Return a custom chain for unknown IDs
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
   * Submit batch settlement transaction
   */
  async submitSettlement(
    intentId: IntentId,
    allocations: Allocation[],
    signatures: SettlementSignature[]
  ): Promise<Hash> {
    console.log('Submitting settlement for intent:', intentId);
    console.log('Allocations:', allocations);
    
    // Filter out zero-amount allocations (contract rejects amount == 0)
    const nonZeroAllocations = allocations.filter((a) => a.amount > 0n);
    const nonZeroParties = new Set(nonZeroAllocations.map((a) => a.partyId));
    const nonZeroSignatures = signatures.filter((s) => nonZeroParties.has(s.partyId));
    
    if (nonZeroAllocations.length === 0) {
      throw new Error('No non-zero allocations to submit');
    }
    
    // Verify we have all signatures
    if (nonZeroSignatures.length !== nonZeroAllocations.length) {
      throw new Error('Mismatch between allocations and signatures');
    }
    
    // Create a map of signatures by party ID for correct pairing
    const signaturesByParty = new Map<number, SettlementSignature>();
    for (const sig of nonZeroSignatures) {
      signaturesByParty.set(sig.partyId, sig);
    }
    
    // Pair each allocation with its corresponding signature by party ID
    const paired = nonZeroAllocations.map((alloc) => {
      const sig = signaturesByParty.get(alloc.partyId);
      if (!sig) {
        throw new Error(`Missing signature for party ${alloc.partyId}`);
      }
      // Verify signature matches allocation
      if (sig.amount !== alloc.amount) {
        throw new Error(
          `Signature amount mismatch for party ${alloc.partyId}: ` +
          `allocation=${alloc.amount}, signature=${sig.amount}`
        );
      }
      return { alloc, sig };
    });
    
    // Sort by party ID to ensure consistent ordering
    const sorted = paired.sort((a, b) => a.alloc.partyId - b.alloc.partyId);
    
    const servers: Address[] = sorted.map((s) => 
      this.getServerAddress(s.alloc.partyId)
    );
    const amounts: bigint[] = sorted.map((s) => s.alloc.amount);
    const sigs: Hash[] = sorted.map((s) => s.sig.signature as Hash);
    
    // Call batchFillIntent
    try {
      const hash = await this.walletClient.writeContract({
        address: this.settlementAddress,
        abi: SETTLEMENT_ABI,
        functionName: 'batchFillIntent',
        args: [intentId as Hash, servers, amounts, sigs],
        chain: this.chain,
        account: this.account,
      });
      
      console.log('Settlement transaction submitted:', hash);
      
      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });
      
      console.log('Settlement confirmed in block:', receipt.blockNumber);
      return hash;
    } catch (error) {
      console.error('Error submitting settlement:', error);
      throw error;
    }
  }
  
  /**
   * Check if intent is already filled
   */
  async isIntentFilled(intentId: IntentId): Promise<boolean> {
    try {
      const status = await (this.publicClient.readContract as any)({
        address: this.settlementAddress,
        abi: SETTLEMENT_ABI,
        functionName: 'getIntentStatus',
        args: [intentId as Hash],
      });
      
      // Status: 0 = pending, 1 = filled, 2 = cancelled
      return status === 1;
    } catch (error) {
      console.error('Error checking intent status:', error);
      return false;
    }
  }
  
  /**
   * Sign a settlement message
   */
  async signSettlement(
    intentId: IntentId,
    amount: bigint,
    serverAddress: Address
  ): Promise<string> {
    // Create message hash
    // In practice, this should match the verification logic in the settlement contract
    const message = this.createSettlementMessage(intentId, amount, serverAddress);
    
    // Sign the message
    const signature = await this.walletClient.signMessage({
      account: this.account,
      message,
    });
    
    return signature;
  }
  
  /**
   * Create settlement message for signing
   */
  private createSettlementMessage(
    intentId: IntentId,
    amount: bigint,
    serverAddress: Address
  ): string {
    return `Settlement for intent ${intentId}: ${amount} from ${serverAddress}`;
  }
  
  /**
   * Get server address for a party ID
   */
  private getServerAddress(partyId: number): Address {
    const address = this.partyAddresses.get(partyId);
    if (!address) {
      throw new Error(`No blockchain address configured for party ${partyId}`);
    }
    return address;
  }
  
  /**
   * Check if node is registered with Settlement contract
   */
  async isNodeRegistered(nodeAddress: Address): Promise<boolean> {
    try {
      const registered = await (this.publicClient.readContract as any)({
        address: this.settlementAddress,
        abi: SETTLEMENT_ABI,
        functionName: 'isNodeRegistered',
        args: [nodeAddress],
      });
      
      return registered as boolean;
    } catch (error) {
      console.error('Error checking node registration:', error);
      return false;
    }
  }
  
  /**
   * Get the node's wallet address
   */
  getNodeAddress(): Address {
    return this.account.address;
  }
  
  /**
   * Get the settlement contract address
   */
  getSettlementAddress(): Address {
    return this.settlementAddress;
  }
  
  /**
   * Estimate gas for settlement
   */
  async estimateSettlementGas(
    intentId: IntentId,
    allocations: Allocation[],
    signatures: SettlementSignature[]
  ): Promise<bigint> {
    // Create a map of signatures by party ID for correct pairing
    const signaturesByParty = new Map<number, SettlementSignature>();
    for (const sig of signatures) {
      signaturesByParty.set(sig.partyId, sig);
    }
    
    // Pair each allocation with its corresponding signature by party ID
    const paired = allocations.map((alloc) => {
      const sig = signaturesByParty.get(alloc.partyId);
      if (!sig) {
        throw new Error(`Missing signature for party ${alloc.partyId}`);
      }
      return { alloc, sig };
    });
    
    // Sort by party ID to ensure consistent ordering
    const sorted = paired.sort((a, b) => a.alloc.partyId - b.alloc.partyId);
    
    const servers: Address[] = sorted.map((s) =>
      this.getServerAddress(s.alloc.partyId)
    );
    const amounts: bigint[] = sorted.map((s) => s.alloc.amount);
    const sigs: Hash[] = sorted.map((s) => s.sig.signature as Hash);
    
    try {
      const gas = await this.publicClient.estimateContractGas({
        address: this.settlementAddress,
        abi: SETTLEMENT_ABI,
        functionName: 'batchFillIntent',
        args: [intentId as Hash, servers, amounts, sigs],
        account: this.account,
      });
      
      return gas;
    } catch (error) {
      console.error('Error estimating gas:', error);
      throw error;
    }
  }
  
  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    return await this.publicClient.getGasPrice();
  }
}
