/**
 * MPC Server
 * Main orchestration layer for privacy-preserving order splitting
 */

import type {
  PartyId,
  PartyConfig,
  Intent,
  IntentId,
  Allocation,
  SettlementSignature,
  ReplicatedShares,
  ServerCapacity,
  MPCResult,
  MessageType,
  P2PMessage,
} from './types.js';
import { MPCSessionManager } from './mpc/session.js';
import { MPCProtocols } from './mpc/protocols.js';
import { P2PNetwork, MessageBuilder } from './network/p2p.js';
import { BlockchainEventListener, eventToIntent, type IntentCreatedEvent } from './blockchain/events.js';
import { SettlementManager } from './blockchain/settlement.js';
import {
  secretShare3Party,
  getPartyShares,
  addShares,
  type ThreePartyShares,
} from './crypto/secret-sharing.js';
import { FIELD_PRIME } from './crypto/field.js';
import type { Address, Hash } from 'viem';

/**
 * MPC Server Configuration
 */
export interface MPCServerConfig {
  partyId: PartyId;
  myConfig: PartyConfig;
  allParties: PartyConfig[];
  rpcUrl: string;
  hookAddress: Address;
  settlementAddress: Address;
  privateKey: Hash;
  chainId?: number;
}

/**
 * MPC Server
 * Coordinates MPC computation for privacy-preserving order splitting
 */
export class MPCServer {
  private config: MPCServerConfig;
  private sessionManager: MPCSessionManager;
  private protocols: MPCProtocols;
  private network: P2PNetwork;
  private eventListener: BlockchainEventListener;
  private settlementManager: SettlementManager;
  
  // Server state
  private capacities: Map<string, ServerCapacity> = new Map();
  private activeIntents: Map<IntentId, Intent> = new Map();
  private pendingAllocations: Map<IntentId, Allocation> = new Map();
  private pendingSignatures: Map<IntentId, SettlementSignature[]> = new Map();
  
  // Received shares from other parties (per intent)
  private receivedShares: Map<IntentId, Map<PartyId, ReplicatedShares>> = new Map();
  
  constructor(config: MPCServerConfig) {
    this.config = config;
    
    // Initialize components
    this.sessionManager = new MPCSessionManager(config.partyId);
    this.protocols = new MPCProtocols(config.partyId, config.allParties.length);
    this.network = new P2PNetwork(config.partyId, config.myConfig, config.allParties);
    this.eventListener = new BlockchainEventListener(
      config.rpcUrl,
      config.hookAddress,
      config.chainId
    );
    this.settlementManager = new SettlementManager(
      config.rpcUrl,
      config.privateKey,
      config.settlementAddress,
      config.chainId
    );
    
    this.setupMessageHandlers();
    this.setupEventHandlers();
  }
  
  /**
   * Start the MPC server
   */
  async start(): Promise<void> {
    console.log(`Starting MPC Server (Party ${this.config.partyId})...`);
    
    // Start P2P network
    await this.network.start();
    
    // Start listening for blockchain events
    await this.eventListener.startListening();
    
    console.log('MPC Server started successfully');
    console.log(`Connections: ${this.network.getConnectionCount()}/${this.config.allParties.length - 1}`);
  }
  
  /**
   * Stop the MPC server
   */
  async stop(): Promise<void> {
    console.log('Stopping MPC Server...');
    
    await this.network.stop();
    this.eventListener.stopListening();
    
    console.log('MPC Server stopped');
  }
  
  /**
   * Set server capacity for a token
   */
  setCapacity(tokenAddress: string, amount: bigint): void {
    this.capacities.set(tokenAddress, {
      tokenAddress,
      amount,
      lastUpdated: Date.now(),
    });
    console.log(`Set capacity for ${tokenAddress}: ${amount}`);
  }
  
  /**
   * Get server capacity for a token
   */
  getCapacity(tokenAddress: string): bigint {
    const capacity = this.capacities.get(tokenAddress);
    return capacity ? capacity.amount : 0n;
  }
  
  /**
   * Setup P2P message handlers
   */
  private setupMessageHandlers(): void {
    // Handle share distribution messages
    this.network.onMessage('SHARE_DISTRIBUTION' as MessageType, async (msg: P2PMessage) => {
      await this.handleShareDistribution(msg);
    });
    
    // Handle computation round messages
    this.network.onMessage('COMPUTATION_ROUND' as MessageType, async (msg: P2PMessage) => {
      await this.handleComputationRound(msg);
    });
    
    // Handle reconstruction requests
    this.network.onMessage('RECONSTRUCTION_REQUEST' as MessageType, async (msg: P2PMessage) => {
      await this.handleReconstructionRequest(msg);
    });
    
    // Handle reconstruction responses
    this.network.onMessage('RECONSTRUCTION_RESPONSE' as MessageType, async (msg: P2PMessage) => {
      await this.handleReconstructionResponse(msg);
    });
    
    // Handle settlement signatures
    this.network.onMessage('SETTLEMENT_SIGNATURE' as MessageType, async (msg: P2PMessage) => {
      await this.handleSettlementSignature(msg);
    });
  }
  
  /**
   * Setup blockchain event handlers
   */
  private setupEventHandlers(): void {
    this.eventListener.onIntentCreated(async (event: IntentCreatedEvent) => {
      await this.handleIntentCreated(event);
    });
  }
  
  /**
   * Handle IntentCreated event from blockchain
   */
  private async handleIntentCreated(event: IntentCreatedEvent): Promise<void> {
    console.log(`\n=== New Intent Created ===`);
    console.log(`Intent ID: ${event.intentId}`);
    console.log(`Amount In: ${event.amountIn}`);
    console.log(`Token In: ${event.tokenIn}`);
    console.log(`Token Out: ${event.tokenOut}`);
    
    const intent = eventToIntent(event);
    this.activeIntents.set(intent.id, intent);
    
    // Check if we have capacity for this token
    const myCapacity = this.getCapacity(event.tokenIn);
    if (myCapacity === 0n) {
      console.log('No capacity for this token, skipping...');
      return;
    }
    
    console.log(`My capacity: ${myCapacity}`);
    
    // Start MPC protocol
    await this.runMPCProtocol(intent, myCapacity);
  }
  
  /**
   * Run the full MPC protocol for an intent
   */
  private async runMPCProtocol(intent: Intent, myCapacity: bigint): Promise<void> {
    try {
      console.log(`\n=== Starting MPC Protocol ===`);
      
      // Create session
      const parties = Array.from({ length: this.config.allParties.length }, (_, i) => i);
      const session = this.sessionManager.createSession(intent.id, parties);
      this.sessionManager.updateSessionStatus(session.id, 'sharing');
      
      // Step 1: Secret share my capacity
      console.log('Step 1: Secret sharing capacity...');
      const allShares = secretShare3Party(myCapacity, FIELD_PRIME);
      const myShares = getPartyShares(allShares, this.config.partyId);
      
      // Store my shares
      this.sessionManager.storeShares(session.id, `capacity_${this.config.partyId}`, myShares);
      
      // Step 2: Distribute shares to other parties
      console.log('Step 2: Distributing shares...');
      await this.distributeShares(session.id, intent.id, allShares);
      
      // Wait for shares from other parties
      console.log('Step 3: Waiting for shares from other parties...');
      await this.waitForAllShares(intent.id, parties.length);
      
      // Step 4: Compute sum of capacities
      console.log('Step 4: Computing total capacity (on shares)...');
      this.sessionManager.updateSessionStatus(session.id, 'computing');
      
      const allCapacityShares: ReplicatedShares[] = [];
      for (let i = 0; i < parties.length; i++) {
        const shares = this.sessionManager.getShares(session.id, `capacity_${i}`);
        if (shares) {
          allCapacityShares.push(shares);
        }
      }
      
      const totalSumShares = this.protocols.computeSumShares(allCapacityShares);
      
      // Step 5: Check if sufficient capacity
      console.log('Step 5: Checking sufficient capacity...');
      const sufficient = await this.protocols.checkSufficientCapacity(
        totalSumShares,
        intent.amountIn,
        async (shares) => {
          // Exchange shares for sum reconstruction
          return await this.exchangeSharesForSum(intent.id, shares);
        }
      );
      
      console.log(`Sufficient capacity: ${sufficient}`);
      
      if (!sufficient) {
        console.log('Insufficient capacity, aborting...');
        this.sessionManager.updateSessionStatus(session.id, 'failed');
        return;
      }
      
      // Step 6: Compute allocations
      console.log('Step 6: Computing allocations...');
      
      // For simplicity, we reveal capacities to compute allocations
      // In a fully private system, this would use secure division
      const capacities: bigint[] = [];
      for (let i = 0; i < parties.length; i++) {
        const shares = this.sessionManager.getShares(session.id, `capacity_${i}`);
        if (shares) {
          // Request reconstruction from other parties
          const capacity = await this.reconstructValue(intent.id, `capacity_${i}`, shares);
          capacities.push(capacity);
        }
      }
      
      const allocations = this.protocols.computeAllocations(capacities, intent.amountIn);
      const myAllocation = allocations[this.config.partyId];
      
      console.log(`My allocation: ${myAllocation.amount}`);
      this.pendingAllocations.set(intent.id, myAllocation);
      
      // Step 7: Sign settlement
      console.log('Step 7: Signing settlement...');
      const signature = await this.settlementManager.signSettlement(
        intent.id,
        myAllocation.amount,
        this.config.myConfig.address as Address
      );
      
      const settlementSig: SettlementSignature = {
        partyId: this.config.partyId,
        intentId: intent.id,
        amount: myAllocation.amount,
        signature,
      };
      
      // Store my signature
      if (!this.pendingSignatures.has(intent.id)) {
        this.pendingSignatures.set(intent.id, []);
      }
      this.pendingSignatures.get(intent.id)!.push(settlementSig);
      
      // Step 8: Exchange signatures
      console.log('Step 8: Broadcasting signature...');
      await this.broadcastSignature(session.id, settlementSig);
      
      // Wait for all signatures
      console.log('Step 9: Waiting for all signatures...');
      await this.waitForAllSignatures(intent.id, parties.length);
      
      // Step 10: Submit settlement (if I'm the leader)
      if (this.config.partyId === 0) {
        console.log('Step 10: Submitting settlement (I am leader)...');
        await this.submitSettlement(intent.id, allocations);
      }
      
      this.sessionManager.updateSessionStatus(session.id, 'completed');
      console.log('=== MPC Protocol Complete ===\n');
      
    } catch (error) {
      console.error('Error in MPC protocol:', error);
    }
  }
  
  /**
   * Distribute shares to other parties
   */
  private async distributeShares(
    sessionId: string,
    intentId: IntentId,
    allShares: ThreePartyShares
  ): Promise<void> {
    for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
      if (partyId === this.config.partyId) continue;
      
      const partyShares = getPartyShares(allShares, partyId);
      
      await this.network.sendToParty(
        partyId,
        MessageBuilder.shareDistribution(
          sessionId,
          partyId,
          intentId,
          {
            [this.config.partyId]: partyShares.share1,
          }
        )
      );
    }
  }
  
  /**
   * Handle incoming share distribution
   */
  private async handleShareDistribution(msg: P2PMessage): Promise<void> {
    const { intentId, shares } = msg.payload;
    const fromParty = msg.from;
    
    console.log(`Received shares from party ${fromParty} for intent ${intentId}`);
    
    // Store received shares
    if (!this.receivedShares.has(intentId)) {
      this.receivedShares.set(intentId, new Map());
    }
    
    const share1 = shares[this.config.partyId];
    // In replicated SS, we need both shares for this party
    // For simplicity, we store what we receive
    this.receivedShares.get(intentId)!.set(fromParty, {
      share1,
      share2: share1, // Placeholder
    });
    
    // Store in session
    const session = this.sessionManager.getSessionByIntent(intentId);
    if (session) {
      this.sessionManager.storeShares(
        session.id,
        `capacity_${fromParty}`,
        { share1, share2: share1 }
      );
    }
  }
  
  /**
   * Wait for shares from all parties
   */
  private async waitForAllShares(intentId: IntentId, numParties: number): Promise<void> {
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const received = this.receivedShares.get(intentId);
      if (received && received.size >= numParties - 1) {
        // Received from all other parties
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    throw new Error('Timeout waiting for shares');
  }
  
  /**
   * Exchange shares for sum computation
   */
  private async exchangeSharesForSum(
    intentId: IntentId,
    myShares: ReplicatedShares
  ): Promise<ReplicatedShares[]> {
    // Broadcast my shares
    for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
      if (partyId === this.config.partyId) continue;
      
      await this.network.sendToParty(
        partyId,
        MessageBuilder.computationRound(
          intentId,
          partyId,
          1,
          { shares: myShares }
        )
      );
    }
    
    // Collect shares from others (simplified)
    return [];
  }
  
  /**
   * Handle computation round message
   */
  private async handleComputationRound(msg: P2PMessage): Promise<void> {
    // Simplified - would store computation round data
    console.log(`Received computation round ${msg.payload.round} from party ${msg.from}`);
  }
  
  /**
   * Reconstruct a value with other parties
   */
  private async reconstructValue(
    intentId: IntentId,
    variable: string,
    myShares: ReplicatedShares
  ): Promise<bigint> {
    // For 3-party RSS, we already have the shares we need
    // This is a simplified reconstruction
    return myShares.share1 + myShares.share2; // Placeholder
  }
  
  /**
   * Handle reconstruction request
   */
  private async handleReconstructionRequest(msg: P2PMessage): Promise<void> {
    const { variable } = msg.payload;
    const session = this.sessionManager.getSession(msg.sessionId);
    
    if (session) {
      const shares = this.sessionManager.getShares(session.id, variable);
      if (shares) {
        await this.network.sendToParty(
          msg.from,
          MessageBuilder.reconstructionResponse(msg.sessionId, msg.from, variable, shares)
        );
      }
    }
  }
  
  /**
   * Handle reconstruction response
   */
  private async handleReconstructionResponse(msg: P2PMessage): Promise<void> {
    // Store reconstructed shares
    console.log(`Received reconstruction response from party ${msg.from}`);
  }
  
  /**
   * Broadcast settlement signature
   */
  private async broadcastSignature(
    sessionId: string,
    signature: SettlementSignature
  ): Promise<void> {
    for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
      if (partyId === this.config.partyId) continue;
      
      await this.network.sendToParty(
        partyId,
        MessageBuilder.settlementSignature(
          sessionId,
          partyId,
          signature.intentId,
          signature.amount,
          signature.signature
        )
      );
    }
  }
  
  /**
   * Handle settlement signature
   */
  private async handleSettlementSignature(msg: P2PMessage): Promise<void> {
    const { intentId, amount, signature } = msg.payload;
    
    console.log(`Received settlement signature from party ${msg.from}`);
    
    const sig: SettlementSignature = {
      partyId: msg.from,
      intentId,
      amount: BigInt(amount),
      signature,
    };
    
    if (!this.pendingSignatures.has(intentId)) {
      this.pendingSignatures.set(intentId, []);
    }
    this.pendingSignatures.get(intentId)!.push(sig);
  }
  
  /**
   * Wait for all signatures
   */
  private async waitForAllSignatures(intentId: IntentId, numParties: number): Promise<void> {
    const timeout = 30000;
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const sigs = this.pendingSignatures.get(intentId);
      if (sigs && sigs.length >= numParties) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    throw new Error('Timeout waiting for signatures');
  }
  
  /**
   * Submit settlement to blockchain
   */
  private async submitSettlement(intentId: IntentId, allocations: Allocation[]): Promise<void> {
    const signatures = this.pendingSignatures.get(intentId);
    if (!signatures) {
      throw new Error('No signatures available');
    }
    
    try {
      const hash = await this.settlementManager.submitSettlement(
        intentId,
        allocations,
        signatures
      );
      console.log(`Settlement submitted: ${hash}`);
      
      // Cleanup
      this.activeIntents.delete(intentId);
      this.pendingAllocations.delete(intentId);
      this.pendingSignatures.delete(intentId);
      this.receivedShares.delete(intentId);
      
    } catch (error) {
      console.error('Error submitting settlement:', error);
      throw error;
    }
  }
}
