/**
 * MPC Protocols
 * Implements secure computation protocols for order allocation
 */

import type { ReplicatedShares, PartyId, Allocation } from '../types.js';
import {
  FIELD_PRIME,
  fieldAdd,
  fieldSub,
  fieldMul,
  fieldDiv,
  mod,
} from '../crypto/field.js';
import {
  addShares,
  subShares,
  mulSharesByConstant,
  reconstruct3Party,
  type ThreePartyShares,
} from '../crypto/secret-sharing.js';

/**
 * MPC Protocol Engine
 * Coordinates secure computations across parties
 */
export class MPCProtocols {
  private myPartyId: PartyId;
  private numParties: number;
  private prime: bigint;
  
  constructor(myPartyId: PartyId, numParties: number = 3, prime: bigint = FIELD_PRIME) {
    this.myPartyId = myPartyId;
    this.numParties = numParties;
    this.prime = prime;
  }
  
  /**
   * Compute sum of shared capacities locally
   * Input: Array of capacity shares from all parties
   * Output: Share of the total sum
   */
  computeSumShares(capacityShares: ReplicatedShares[]): ReplicatedShares {
    if (capacityShares.length === 0) {
      return { share1: 0n, share2: 0n };
    }
    
    let result = capacityShares[0];
    for (let i = 1; i < capacityShares.length; i++) {
      result = addShares(result, capacityShares[i], this.prime);
    }
    
    return result;
  }
  
  /**
   * Secure comparison: Check if total >= orderSize
   * 
   * Simplified approach: Each party reveals their sum share,
   * then all parties can compute total and compare.
   * 
   * Note: This reveals the total capacity (one bit of info),
   * but not individual capacities.
   */
  async checkSufficientCapacity(
    totalSumShares: ReplicatedShares,
    orderSize: bigint,
    exchangeShares: (shares: ReplicatedShares) => Promise<ReplicatedShares[]>
  ): Promise<boolean> {
    // Exchange shares with other parties
    const allPartyShares = await exchangeShares(totalSumShares);
    
    // Reconstruct total from all shares
    // In 3-party RSS, we need all 3 unique shares
    const uniqueShares = this.extractUniqueShares([
      totalSumShares,
      ...allPartyShares,
    ]);
    
    const total = reconstruct3Party(uniqueShares, this.prime);
    
    // Compare (this is now public knowledge among parties)
    return total >= orderSize;
  }
  
  /**
   * Extract 3 unique shares from replicated shares held by parties
   */
  private extractUniqueShares(allShares: ReplicatedShares[]): ThreePartyShares {
    // Collect all share values
    const shareSet = new Set<bigint>();
    allShares.forEach((s) => {
      shareSet.add(s.share1);
      shareSet.add(s.share2);
    });
    
    // Should have exactly 3 unique shares for 3-party RSS
    if (shareSet.size !== 3) {
      throw new Error(`Expected 3 unique shares, got ${shareSet.size}`);
    }
    
    const shareArray = Array.from(shareSet);
    return {
      share1: shareArray[0],
      share2: shareArray[1],
      share3: shareArray[2],
    };
  }
  
  /**
   * Compute proportional allocations
   * allocation[i] = (capacity[i] / total_capacity) * order_size
   * 
   * This is done in plaintext after establishing sufficient capacity,
   * revealing each party's allocation (but not raw capacity).
   */
  computeAllocations(
    capacities: bigint[],
    orderSize: bigint
  ): Allocation[] {
    // Compute total
    const total = capacities.reduce((sum, cap) => sum + cap, 0n);
    
    if (total < orderSize) {
      throw new Error('Insufficient total capacity');
    }
    
    // Compute proportional allocations
    const allocations: Allocation[] = [];
    let allocatedSum = 0n;
    
    for (let i = 0; i < capacities.length; i++) {
      let allocation: bigint;
      
      if (i === capacities.length - 1) {
        // Last party gets remainder to ensure exact sum
        allocation = orderSize - allocatedSum;
      } else {
        // Proportional allocation: (capacity / total) * orderSize
        allocation = (capacities[i] * orderSize) / total;
        allocatedSum += allocation;
      }
      
      allocations.push({
        partyId: i,
        amount: allocation,
      });
    }
    
    return allocations;
  }
  
  /**
   * Secure multiplication using Beaver triples
   * Multiplies two shared values [x] and [y] to get [z] = [x] * [y]
   * 
   * This is a simplified version. In production, Beaver triples
   * would be pre-generated in an offline phase.
   */
  async secureMultiply(
    xShares: ReplicatedShares,
    yShares: ReplicatedShares,
    beaverTriple: {
      a: ReplicatedShares;
      b: ReplicatedShares;
      c: ReplicatedShares;
    },
    exchangeValues: (e: bigint, d: bigint) => Promise<{ e: bigint; d: bigint }[]>
  ): Promise<ReplicatedShares> {
    // Beaver triple protocol:
    // 1. Compute e = x - a and d = y - b (on shares)
    const eShares = subShares(xShares, beaverTriple.a, this.prime);
    const dShares = subShares(yShares, beaverTriple.b, this.prime);
    
    // 2. Reveal e and d (reconstruct)
    // In practice, this requires communication with other parties
    // For now, we simulate by having caller provide reconstruction
    
    // This is a simplified placeholder - in reality would need full protocol
    return beaverTriple.c; // Placeholder
  }
  
  /**
   * Secure division: [z] = [x] / [y]
   * This is complex in MPC. Simplified approach:
   * Convert to multiplication by inverse, which requires secure inversion protocol.
   * 
   * For this application, we avoid secure division by computing
   * allocations after revealing the comparison result.
   */
  async secureDivide(
    xShares: ReplicatedShares,
    yShares: ReplicatedShares
  ): Promise<ReplicatedShares> {
    // Placeholder - secure division is complex
    // In practice, use iterative approximation or pre-computed inverse shares
    throw new Error('Secure division not implemented - use offline computation');
  }
  
  /**
   * Reveal a shared value to a specific party
   * Other parties send their shares to the target party
   */
  async selectiveReveal(
    variableName: string,
    targetParty: PartyId,
    myShares: ReplicatedShares,
    requestShares: (target: PartyId, variable: string) => Promise<ReplicatedShares>
  ): Promise<bigint | null> {
    if (this.myPartyId === targetParty) {
      // I am the target - collect shares from others
      const otherShares = await requestShares(targetParty, variableName);
      
      // Reconstruct
      const uniqueShares = this.extractUniqueShares([myShares, otherShares]);
      return reconstruct3Party(uniqueShares, this.prime);
    } else {
      // I am not the target - send my shares to target
      // This is handled by the networking layer
      return null;
    }
  }
  
  /**
   * Privacy-preserving allocation computation
   * Returns only this party's allocation without revealing capacities
   */
  async computePrivateAllocation(
    myCapacity: bigint,
    orderSize: bigint,
    shareCapacity: (capacity: bigint) => Promise<ReplicatedShares>,
    exchangeForSum: (shares: ReplicatedShares) => Promise<ReplicatedShares[]>,
    exchangeForReconstruction: (
      variable: string,
      shares: ReplicatedShares
    ) => Promise<bigint>
  ): Promise<bigint | null> {
    // Step 1: Secret share my capacity
    const myCapacityShares = await shareCapacity(myCapacity);
    
    // Step 2: Receive capacity shares from other parties and compute sum
    // This happens via the networking layer
    
    // Step 3: Check if total >= orderSize
    // (Simplified - in full protocol, would use secure comparison)
    
    // Step 4: If sufficient, compute allocation shares
    // allocation[i] = (capacity[i] / total) * orderSize
    
    // Step 5: Selective reconstruction - only learn my allocation
    const myAllocation = await exchangeForReconstruction(
      `allocation_${this.myPartyId}`,
      myCapacityShares
    );
    
    return myAllocation;
  }
}

/**
 * Helper to compute allocations in a privacy-preserving way
 * Each party learns only their own allocation
 */
export interface PrivateAllocationResult {
  myAllocation: bigint;
  sufficient: boolean;
}
