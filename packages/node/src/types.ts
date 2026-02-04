/**
 * Core type definitions for MPC-based order splitting system
 */

export type PartyId = number;
export type IntentId = string;
export type Share = bigint;
export type SecretValue = bigint;

/**
 * Configuration for an MPC party/server
 */
export interface PartyConfig {
  id: PartyId;
  address: string;
  port: number;
  publicKey?: string;
  privateKey?: string;
}

/**
 * Network configuration for the MPC system
 */
export interface NetworkConfig {
  parties: PartyConfig[];
  threshold: number; // Minimum number of honest parties
  prime: bigint; // Prime modulus for field operations
}

/**
 * Intent representing a large swap order
 */
export interface Intent {
  id: IntentId;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  user: string;
  deadline: bigint;
  timestamp: number;
  status: 'pending' | 'processing' | 'filled' | 'cancelled';
}

/**
 * Secret shares for replicated secret sharing
 * In 3-party RSS, each party holds 2 out of 3 shares
 */
export interface ReplicatedShares {
  share1: Share;
  share2: Share;
}

/**
 * Allocation result from MPC computation
 */
export interface Allocation {
  partyId: PartyId;
  amount: bigint;
}

/**
 * MPC computation result
 */
export interface MPCResult {
  success: boolean;
  sufficient: boolean;
  allocations?: Allocation[];
  error?: string;
}

/**
 * Settlement signature from a party
 */
export interface SettlementSignature {
  partyId: PartyId;
  intentId: IntentId;
  amount: bigint;
  signature: string;
}

/**
 * Message types for P2P communication
 */
export enum MessageType {
  SHARE_DISTRIBUTION = 'SHARE_DISTRIBUTION',
  COMPUTATION_ROUND = 'COMPUTATION_ROUND',
  RECONSTRUCTION_REQUEST = 'RECONSTRUCTION_REQUEST',
  RECONSTRUCTION_RESPONSE = 'RECONSTRUCTION_RESPONSE',
  SETTLEMENT_SIGNATURE = 'SETTLEMENT_SIGNATURE',
  PING = 'PING',
  PONG = 'PONG',
}

/**
 * Generic P2P message
 */
export interface P2PMessage {
  type: MessageType;
  from: PartyId;
  to: PartyId;
  sessionId: string;
  payload: any;
  timestamp: number;
}

/**
 * Share distribution message payload
 */
export interface ShareDistributionPayload {
  intentId: IntentId;
  shares: {
    [partyId: number]: Share;
  };
}

/**
 * Computation round message payload
 */
export interface ComputationRoundPayload {
  round: number;
  data: any;
}

/**
 * Reconstruction request/response payload
 */
export interface ReconstructionPayload {
  variable: string; // Which variable to reconstruct (e.g., "allocation_0")
  share?: Share;
}

/**
 * Server capacity information (kept private)
 */
export interface ServerCapacity {
  tokenAddress: string;
  amount: bigint;
  lastUpdated: number;
}

/**
 * MPC session state
 */
export interface MPCSession {
  id: string;
  intentId: IntentId;
  parties: PartyId[];
  myPartyId: PartyId;
  status: 'initializing' | 'sharing' | 'computing' | 'reconstructing' | 'completed' | 'failed';
  shares: Map<string, ReplicatedShares>; // Variable name -> shares
  startTime: number;
  endTime?: number;
}
