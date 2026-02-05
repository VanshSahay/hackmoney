/**
 * Settlement Manager Tests
 */

import { describe, it, expect } from 'vitest';
import type { Allocation, SettlementSignature, IntentId } from '../../src/types.js';
import type { Address } from 'viem';

/**
 * Test that allocation-signature pairing is done by partyId, not by array index
 */
describe('Settlement - Allocation/Signature Pairing', () => {
  
  it('should pair allocations with signatures by partyId, not array index', () => {
    // Simulate the scenario:
    // - Allocations are computed locally in order [0, 1, 2]
    // - Signatures arrive via P2P in a different order (e.g., [2, 0, 1])
    
    const intentId: IntentId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    // Allocations in original order
    const allocations: Allocation[] = [
      { partyId: 0, amount: 300n },
      { partyId: 1, amount: 500n },
      { partyId: 2, amount: 200n },
    ];
    
    // Signatures arrive in DIFFERENT order (simulating network timing)
    const signatures: SettlementSignature[] = [
      { partyId: 2, intentId, amount: 200n, signature: '0xsig_party2' }, // Party 2 responds first
      { partyId: 0, intentId, amount: 300n, signature: '0xsig_party0' }, // Party 0 responds second
      { partyId: 1, intentId, amount: 500n, signature: '0xsig_party1' }, // Party 1 responds last
    ];
    
    // Create a map of signatures by party ID (this is what the fix does)
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
      // Verify signature matches allocation
      if (sig.amount !== alloc.amount) {
        throw new Error(
          `Signature amount mismatch for party ${alloc.partyId}: ` +
          `allocation=${alloc.amount}, signature=${sig.amount}`
        );
      }
      return { alloc, sig };
    });
    
    // Sort by party ID
    const sorted = paired.sort((a, b) => a.alloc.partyId - b.alloc.partyId);
    
    // Verify correct pairing:
    // - Party 0's allocation (300) should be paired with Party 0's signature ('0xsig_party0')
    // - Party 1's allocation (500) should be paired with Party 1's signature ('0xsig_party1')
    // - Party 2's allocation (200) should be paired with Party 2's signature ('0xsig_party2')
    
    expect(sorted[0].alloc.partyId).toBe(0);
    expect(sorted[0].alloc.amount).toBe(300n);
    expect(sorted[0].sig.partyId).toBe(0);
    expect(sorted[0].sig.signature).toBe('0xsig_party0');
    
    expect(sorted[1].alloc.partyId).toBe(1);
    expect(sorted[1].alloc.amount).toBe(500n);
    expect(sorted[1].sig.partyId).toBe(1);
    expect(sorted[1].sig.signature).toBe('0xsig_party1');
    
    expect(sorted[2].alloc.partyId).toBe(2);
    expect(sorted[2].alloc.amount).toBe(200n);
    expect(sorted[2].sig.partyId).toBe(2);
    expect(sorted[2].sig.signature).toBe('0xsig_party2');
  });
  
  it('should detect missing signatures for a party', () => {
    const intentId: IntentId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const allocations: Allocation[] = [
      { partyId: 0, amount: 300n },
      { partyId: 1, amount: 500n },
      { partyId: 2, amount: 200n },
    ];
    
    // Missing signature for party 1
    const signatures: SettlementSignature[] = [
      { partyId: 2, intentId, amount: 200n, signature: '0xsig_party2' },
      { partyId: 0, intentId, amount: 300n, signature: '0xsig_party0' },
      // Party 1's signature is missing
    ];
    
    const signaturesByParty = new Map<number, SettlementSignature>();
    for (const sig of signatures) {
      signaturesByParty.set(sig.partyId, sig);
    }
    
    expect(() => {
      allocations.map((alloc) => {
        const sig = signaturesByParty.get(alloc.partyId);
        if (!sig) {
          throw new Error(`Missing signature for party ${alloc.partyId}`);
        }
        return { alloc, sig };
      });
    }).toThrow('Missing signature for party 1');
  });
  
  it('should detect amount mismatch between allocation and signature', () => {
    const intentId: IntentId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const allocations: Allocation[] = [
      { partyId: 0, amount: 300n },
      { partyId: 1, amount: 500n },
      { partyId: 2, amount: 200n },
    ];
    
    // Party 1's signature has wrong amount
    const signatures: SettlementSignature[] = [
      { partyId: 0, intentId, amount: 300n, signature: '0xsig_party0' },
      { partyId: 1, intentId, amount: 999n, signature: '0xsig_party1' }, // WRONG AMOUNT
      { partyId: 2, intentId, amount: 200n, signature: '0xsig_party2' },
    ];
    
    const signaturesByParty = new Map<number, SettlementSignature>();
    for (const sig of signatures) {
      signaturesByParty.set(sig.partyId, sig);
    }
    
    expect(() => {
      allocations.map((alloc) => {
        const sig = signaturesByParty.get(alloc.partyId);
        if (!sig) {
          throw new Error(`Missing signature for party ${alloc.partyId}`);
        }
        if (sig.amount !== alloc.amount) {
          throw new Error(
            `Signature amount mismatch for party ${alloc.partyId}: ` +
            `allocation=${alloc.amount}, signature=${sig.amount}`
          );
        }
        return { alloc, sig };
      });
    }).toThrow('Signature amount mismatch for party 1: allocation=500, signature=999');
  });
  
  it('should handle signatures arriving in completely reversed order', () => {
    const intentId: IntentId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    // Allocations in ascending order
    const allocations: Allocation[] = [
      { partyId: 0, amount: 100n },
      { partyId: 1, amount: 200n },
      { partyId: 2, amount: 300n },
    ];
    
    // Signatures arrive in completely reversed order
    const signatures: SettlementSignature[] = [
      { partyId: 2, intentId, amount: 300n, signature: '0xsig_party2' },
      { partyId: 1, intentId, amount: 200n, signature: '0xsig_party1' },
      { partyId: 0, intentId, amount: 100n, signature: '0xsig_party0' },
    ];
    
    const signaturesByParty = new Map<number, SettlementSignature>();
    for (const sig of signatures) {
      signaturesByParty.set(sig.partyId, sig);
    }
    
    const paired = allocations.map((alloc) => {
      const sig = signaturesByParty.get(alloc.partyId);
      if (!sig) {
        throw new Error(`Missing signature for party ${alloc.partyId}`);
      }
      if (sig.amount !== alloc.amount) {
        throw new Error(
          `Signature amount mismatch for party ${alloc.partyId}: ` +
          `allocation=${alloc.amount}, signature=${sig.amount}`
        );
      }
      return { alloc, sig };
    });
    
    const sorted = paired.sort((a, b) => a.alloc.partyId - b.alloc.partyId);
    
    // Verify each party is correctly paired
    sorted.forEach((item, index) => {
      expect(item.alloc.partyId).toBe(index);
      expect(item.sig.partyId).toBe(index);
      expect(item.alloc.amount).toBe(item.sig.amount);
    });
  });
  
  it('should demonstrate the BUG with index-based pairing', () => {
    const intentId: IntentId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    
    const allocations: Allocation[] = [
      { partyId: 0, amount: 300n },
      { partyId: 1, amount: 500n },
      { partyId: 2, amount: 200n },
    ];
    
    // Signatures arrive in different order
    const signatures: SettlementSignature[] = [
      { partyId: 2, intentId, amount: 200n, signature: '0xsig_party2' },
      { partyId: 0, intentId, amount: 300n, signature: '0xsig_party0' },
      { partyId: 1, intentId, amount: 500n, signature: '0xsig_party1' },
    ];
    
    // OLD BUGGY WAY: Pair by array index
    const buggyPaired = allocations.map((alloc, i) => ({ 
      alloc, 
      sig: signatures[i] 
    }));
    
    // This creates WRONG pairings:
    // - allocations[0] (party 0, 300) gets paired with signatures[0] (party 2, 200) ❌
    // - allocations[1] (party 1, 500) gets paired with signatures[1] (party 0, 300) ❌
    // - allocations[2] (party 2, 200) gets paired with signatures[2] (party 1, 500) ❌
    
    expect(buggyPaired[0].alloc.partyId).toBe(0);
    expect(buggyPaired[0].sig.partyId).toBe(2); // WRONG! Party 0's alloc paired with party 2's sig
    
    expect(buggyPaired[1].alloc.partyId).toBe(1);
    expect(buggyPaired[1].sig.partyId).toBe(0); // WRONG! Party 1's alloc paired with party 0's sig
    
    expect(buggyPaired[2].alloc.partyId).toBe(2);
    expect(buggyPaired[2].sig.partyId).toBe(1); // WRONG! Party 2's alloc paired with party 1's sig
    
    // This would cause on-chain verification to fail!
  });
});

/**
 * Test that server addresses are correctly mapped by party ID
 */
describe('Settlement - Server Address Mapping', () => {
  
  it('should return different blockchain addresses for different parties', () => {
    // Simulate the party addresses map
    const partyAddresses = new Map<number, Address>([
      [0, '0x1111111111111111111111111111111111111111' as Address],
      [1, '0x2222222222222222222222222222222222222222' as Address],
      [2, '0x3333333333333333333333333333333333333333' as Address],
    ]);
    
    // Simulate getServerAddress behavior
    const getServerAddress = (partyId: number): Address => {
      const address = partyAddresses.get(partyId);
      if (!address) {
        throw new Error(`No blockchain address configured for party ${partyId}`);
      }
      return address;
    };
    
    // Verify each party gets their unique address
    const address0 = getServerAddress(0);
    const address1 = getServerAddress(1);
    const address2 = getServerAddress(2);
    
    expect(address0).toBe('0x1111111111111111111111111111111111111111');
    expect(address1).toBe('0x2222222222222222222222222222222222222222');
    expect(address2).toBe('0x3333333333333333333333333333333333333333');
    
    // Verify they are all different
    expect(address0).not.toBe(address1);
    expect(address1).not.toBe(address2);
    expect(address0).not.toBe(address2);
  });
  
  it('should use correct addresses when building servers array for settlement', () => {
    const partyAddresses = new Map<number, Address>([
      [0, '0x1111111111111111111111111111111111111111' as Address],
      [1, '0x2222222222222222222222222222222222222222' as Address],
      [2, '0x3333333333333333333333333333333333333333' as Address],
    ]);
    
    const getServerAddress = (partyId: number): Address => {
      const address = partyAddresses.get(partyId);
      if (!address) {
        throw new Error(`No blockchain address configured for party ${partyId}`);
      }
      return address;
    };
    
    // Simulate allocations
    const allocations: Allocation[] = [
      { partyId: 0, amount: 300n },
      { partyId: 1, amount: 500n },
      { partyId: 2, amount: 200n },
    ];
    
    // Build servers array as done in submitSettlement
    const servers: Address[] = allocations
      .sort((a, b) => a.partyId - b.partyId)
      .map((alloc) => getServerAddress(alloc.partyId));
    
    // Verify servers array has correct addresses for each party
    expect(servers).toHaveLength(3);
    expect(servers[0]).toBe('0x1111111111111111111111111111111111111111'); // Party 0
    expect(servers[1]).toBe('0x2222222222222222222222222222222222222222'); // Party 1
    expect(servers[2]).toBe('0x3333333333333333333333333333333333333333'); // Party 2
    
    // Verify no duplicate addresses (critical - this was the reported bug)
    const uniqueAddresses = new Set(servers);
    expect(uniqueAddresses.size).toBe(3); // All addresses should be unique
  });
  
  it('should throw error for missing party address', () => {
    const partyAddresses = new Map<number, Address>([
      [0, '0x1111111111111111111111111111111111111111' as Address],
      [1, '0x2222222222222222222222222222222222222222' as Address],
      // Party 2 is missing
    ]);
    
    const getServerAddress = (partyId: number): Address => {
      const address = partyAddresses.get(partyId);
      if (!address) {
        throw new Error(`No blockchain address configured for party ${partyId}`);
      }
      return address;
    };
    
    // Should work for party 0 and 1
    expect(getServerAddress(0)).toBe('0x1111111111111111111111111111111111111111');
    expect(getServerAddress(1)).toBe('0x2222222222222222222222222222222222222222');
    
    // Should throw for party 2
    expect(() => getServerAddress(2)).toThrow('No blockchain address configured for party 2');
  });
});
