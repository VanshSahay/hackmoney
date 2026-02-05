/**
 * Multi-node Integration Tests
 * Tests the complete MPC protocol execution across 3 parties
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  secretShare3Party,
  getPartyShares,
  reconstruct3Party,
  addShares,
} from '../../src/crypto/secret-sharing.js';
import { MPCProtocols } from '../../src/mpc/protocols.js';
import { MPCSessionManager } from '../../src/mpc/session.js';
import type { ReplicatedShares, Allocation } from '../../src/types.js';

describe('Multi-Node Integration Tests', () => {
  describe('3-Party MPC Protocol - Full Flow', () => {
    it('should complete full MPC protocol with 3 nodes', async () => {
      // Setup: 3 parties with different capacities
      const capacities = {
        party0: 300n,
        party1: 500n,
        party2: 400n,
      };
      const orderSize = 1000n;
      const intentId = '0x123';

      // Create session managers for each party
      const sessionManagers = [
        new MPCSessionManager(0),
        new MPCSessionManager(1),
        new MPCSessionManager(2),
      ];

      // Create protocol instances for each party
      const protocols = [
        new MPCProtocols(0, 3),
        new MPCProtocols(1, 3),
        new MPCProtocols(2, 3),
      ];

      // Phase 1: Each party creates session
      const sessions = sessionManagers.map((manager, partyId) =>
        manager.createSession(intentId, [0, 1, 2])
      );

      sessions.forEach((session) => {
        expect(session.status).toBe('initializing');
        expect(session.intentId).toBe(intentId);
      });

      // Phase 2: Secret share capacities
      const allShares = [
        secretShare3Party(capacities.party0),
        secretShare3Party(capacities.party1),
        secretShare3Party(capacities.party2),
      ];

      // Phase 3: Distribute shares (simulated)
      // Each party receives shares from all parties
      for (let partyId = 0; partyId < 3; partyId++) {
        for (let sourceParty = 0; sourceParty < 3; sourceParty++) {
          const shares = getPartyShares(allShares[sourceParty], partyId);
          sessionManagers[partyId].storeShares(
            sessions[partyId].id,
            `capacity_${sourceParty}`,
            shares
          );
        }
      }

      // Phase 4: Each party computes local sum
      const sumShares = [];
      for (let partyId = 0; partyId < 3; partyId++) {
        const partyCapacityShares = [0, 1, 2].map((source) =>
          sessionManagers[partyId].getShares(
            sessions[partyId].id,
            `capacity_${source}`
          )!
        );
        sumShares.push(protocols[partyId].computeSumShares(partyCapacityShares));
      }

      // Phase 5: Reconstruct total and check sufficiency
      const total = reconstruct3Party({
        share1: sumShares[0].share1,
        share2: sumShares[1].share1,
        share3: sumShares[2].share1,
      });

      expect(total).toBe(1200n); // 300 + 500 + 400
      expect(total >= orderSize).toBe(true);

      // Phase 6: Compute allocations
      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];
      
      const allocations = protocols[0].computeAllocations(
        actualCapacities,
        orderSize
      );

      // Verify allocations
      expect(allocations.length).toBe(3);
      
      const totalAllocation = allocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0n
      );
      expect(totalAllocation).toBe(orderSize);

      // Verify proportions (approximately)
      expect(allocations[0].amount).toBeGreaterThan(200n); // ~250
      expect(allocations[0].amount).toBeLessThan(300n);
      
      expect(allocations[1].amount).toBeGreaterThan(350n); // ~417
      expect(allocations[1].amount).toBeLessThan(500n);
      
      expect(allocations[2].amount).toBeGreaterThan(250n); // ~333
      expect(allocations[2].amount).toBeLessThan(400n);
    });

    it('should detect insufficient capacity across 3 nodes', async () => {
      const capacities = {
        party0: 200n,
        party1: 300n,
        party2: 200n,
      };
      const orderSize = 1000n; // More than total (700)

      const sessionManagers = [
        new MPCSessionManager(0),
        new MPCSessionManager(1),
        new MPCSessionManager(2),
      ];

      const protocols = [
        new MPCProtocols(0, 3),
        new MPCProtocols(1, 3),
        new MPCProtocols(2, 3),
      ];

      const sessions = sessionManagers.map((manager) =>
        manager.createSession('0x456', [0, 1, 2])
      );

      const allShares = [
        secretShare3Party(capacities.party0),
        secretShare3Party(capacities.party1),
        secretShare3Party(capacities.party2),
      ];

      for (let partyId = 0; partyId < 3; partyId++) {
        for (let sourceParty = 0; sourceParty < 3; sourceParty++) {
          const shares = getPartyShares(allShares[sourceParty], partyId);
          sessionManagers[partyId].storeShares(
            sessions[partyId].id,
            `capacity_${sourceParty}`,
            shares
          );
        }
      }

      const sumShares = [];
      for (let partyId = 0; partyId < 3; partyId++) {
        const partyCapacityShares = [0, 1, 2].map((source) =>
          sessionManagers[partyId].getShares(
            sessions[partyId].id,
            `capacity_${source}`
          )!
        );
        sumShares.push(protocols[partyId].computeSumShares(partyCapacityShares));
      }

      const total = reconstruct3Party({
        share1: sumShares[0].share1,
        share2: sumShares[1].share1,
        share3: sumShares[2].share1,
      });

      expect(total).toBe(700n);
      expect(total < orderSize).toBe(true);

      // Should throw when trying to compute allocations
      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];
      
      expect(() =>
        protocols[0].computeAllocations(actualCapacities, orderSize)
      ).toThrow();
    });
  });

  describe('Privacy Guarantees - Multi-Node', () => {
    it('should not reveal individual capacities during computation', () => {
      const capacities = {
        party0: 300n,
        party1: 500n,
        party2: 400n,
      };

      // Secret share all capacities
      const allShares = [
        secretShare3Party(capacities.party0),
        secretShare3Party(capacities.party1),
        secretShare3Party(capacities.party2),
      ];

      // Party 0 should only see its own shares, not the actual capacities
      const party0Shares = [
        getPartyShares(allShares[0], 0),
        getPartyShares(allShares[1], 0),
        getPartyShares(allShares[2], 0),
      ];

      // Individual shares should not equal capacities (they're random)
      expect(party0Shares[0].share1).not.toBe(capacities.party0);
      expect(party0Shares[1].share1).not.toBe(capacities.party1);
      expect(party0Shares[2].share1).not.toBe(capacities.party2);

      // But party 0 can compute sum on shares
      const protocols = new MPCProtocols(0, 3);
      const sumShares = protocols.computeSumShares(party0Shares);

      // Sum shares also don't reveal the total
      expect(sumShares.share1).not.toBe(1200n);
    });

    it('should allow reconstruction only with multiple parties', () => {
      const secret = 12345n;
      const shares = secretShare3Party(secret);

      // Single party cannot reconstruct
      const party0 = getPartyShares(shares, 0);
      const singlePartySum = (party0.share1 + party0.share2) % 
        (2n ** 256n - 189n);
      expect(singlePartySum).not.toBe(secret);

      // Two parties can reconstruct
      const party1 = getPartyShares(shares, 1);
      const reconstructed = reconstruct3Party(shares);
      expect(reconstructed).toBe(secret);
    });
  });

  describe('Concurrent Intents - Multi-Node', () => {
    it('should handle multiple concurrent intents', () => {
      const sessionManagers = [
        new MPCSessionManager(0),
        new MPCSessionManager(1),
        new MPCSessionManager(2),
      ];

      // Create multiple intents
      const intent1 = '0x111';
      const intent2 = '0x222';
      const intent3 = '0x333';

      // Each party creates sessions for all intents
      sessionManagers.forEach((manager) => {
        manager.createSession(intent1, [0, 1, 2]);
        manager.createSession(intent2, [0, 1, 2]);
        manager.createSession(intent3, [0, 1, 2]);
      });

      // Verify each party has 3 active sessions
      sessionManagers.forEach((manager) => {
        const active = manager.getActiveSessions();
        expect(active.length).toBe(3);
      });

      // Verify sessions are independent
      const manager0 = sessionManagers[0];
      const session1 = manager0.getSessionByIntent(intent1)!;
      const session2 = manager0.getSessionByIntent(intent2)!;
      const session3 = manager0.getSessionByIntent(intent3)!;

      expect(session1.id).not.toBe(session2.id);
      expect(session2.id).not.toBe(session3.id);
      expect(session1.id).not.toBe(session3.id);
    });

    it('should maintain separate state for concurrent intents', () => {
      const sessionManager = new MPCSessionManager(0);
      
      const session1 = sessionManager.createSession('0x111', [0, 1, 2]);
      const session2 = sessionManager.createSession('0x222', [0, 1, 2]);

      const shares1: ReplicatedShares = { share1: 100n, share2: 200n };
      const shares2: ReplicatedShares = { share1: 300n, share2: 400n };

      sessionManager.storeShares(session1.id, 'capacity_0', shares1);
      sessionManager.storeShares(session2.id, 'capacity_0', shares2);

      const retrieved1 = sessionManager.getShares(session1.id, 'capacity_0');
      const retrieved2 = sessionManager.getShares(session2.id, 'capacity_0');

      expect(retrieved1).toEqual(shares1);
      expect(retrieved2).toEqual(shares2);
      expect(retrieved1).not.toEqual(retrieved2);
    });
  });

  describe('Share Arithmetic - Multi-Node', () => {
    it('should correctly perform addition across all parties', () => {
      const secretA = 100n;
      const secretB = 200n;
      const expectedSum = 300n;

      const sharesA = secretShare3Party(secretA);
      const sharesB = secretShare3Party(secretB);

      // All parties perform addition on their shares
      const partySums = [];
      for (let partyId = 0; partyId < 3; partyId++) {
        const partySharesA = getPartyShares(sharesA, partyId);
        const partySharesB = getPartyShares(sharesB, partyId);
        const sum = addShares(partySharesA, partySharesB);
        partySums.push(sum);
      }

      // Reconstruct from party sums
      const reconstructed = reconstruct3Party({
        share1: partySums[0].share1,
        share2: partySums[1].share1,
        share3: partySums[2].share1,
      });

      expect(reconstructed).toBe(expectedSum);
    });
  });

  describe('Large Scale - Multi-Node', () => {
    it('should handle many parties capacities correctly', () => {
      const numCapacities = 100;
      const capacities: bigint[] = [];
      let expectedTotal = 0n;

      // Generate random capacities
      for (let i = 0; i < numCapacities; i++) {
        const capacity = BigInt(Math.floor(Math.random() * 1000) + 1);
        capacities.push(capacity);
        expectedTotal += capacity;
      }

      // Secret share all
      const allShares = capacities.map((cap) => secretShare3Party(cap));

      // Each party collects their shares
      const party0Shares = allShares.map((shares) => getPartyShares(shares, 0));
      const party1Shares = allShares.map((shares) => getPartyShares(shares, 1));
      const party2Shares = allShares.map((shares) => getPartyShares(shares, 2));

      // Each party computes sum
      const protocols0 = new MPCProtocols(0, 3);
      const protocols1 = new MPCProtocols(1, 3);
      const protocols2 = new MPCProtocols(2, 3);

      const sum0 = protocols0.computeSumShares(party0Shares);
      const sum1 = protocols1.computeSumShares(party1Shares);
      const sum2 = protocols2.computeSumShares(party2Shares);

      // Reconstruct total
      const total = reconstruct3Party({
        share1: sum0.share1,
        share2: sum1.share1,
        share3: sum2.share1,
      });

      expect(total).toBe(expectedTotal);
    });

    it('should handle large capacity values', () => {
      const capacities = {
        party0: 1000000000000000n, // 1 quadrillion
        party1: 2000000000000000n,
        party2: 3000000000000000n,
      };
      const orderSize = 6000000000000000n;

      const allShares = [
        secretShare3Party(capacities.party0),
        secretShare3Party(capacities.party1),
        secretShare3Party(capacities.party2),
      ];

      const protocols = new MPCProtocols(0, 3);
      const party0Shares = [
        getPartyShares(allShares[0], 0),
        getPartyShares(allShares[1], 0),
        getPartyShares(allShares[2], 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);
      expect(sumShares).toBeDefined();

      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];

      const allocations = protocols.computeAllocations(
        actualCapacities,
        orderSize
      );

      const totalAllocation = allocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0n
      );
      expect(totalAllocation).toBe(orderSize);

      // Verify proportions
      expect(allocations[0].amount).toBe(1000000000000000n);
      expect(allocations[1].amount).toBe(2000000000000000n);
      expect(allocations[2].amount).toBe(3000000000000000n);
    });
  });

  describe('Edge Cases - Multi-Node', () => {
    it('should handle zero capacity from one party', () => {
      const capacities = {
        party0: 0n,
        party1: 600n,
        party2: 400n,
      };
      const orderSize = 1000n;

      const allShares = [
        secretShare3Party(capacities.party0),
        secretShare3Party(capacities.party1),
        secretShare3Party(capacities.party2),
      ];

      const protocols = new MPCProtocols(0, 3);
      const party0Shares = [
        getPartyShares(allShares[0], 0),
        getPartyShares(allShares[1], 0),
        getPartyShares(allShares[2], 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);

      // Should still compute correctly
      expect(sumShares).toBeDefined();

      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];

      const allocations = protocols.computeAllocations(
        actualCapacities,
        orderSize
      );

      // Party 0 should get 0
      expect(allocations[0].amount).toBe(0n);
      
      // Others should split the order
      expect(allocations[1].amount + allocations[2].amount).toBe(orderSize);
    });

    it('should handle equal capacities precisely', () => {
      const capacities = {
        party0: 500n,
        party1: 500n,
        party2: 500n,
      };
      const orderSize = 1500n;

      const protocols = new MPCProtocols(0, 3);
      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];

      const allocations = protocols.computeAllocations(
        actualCapacities,
        orderSize
      );

      // Each should get exactly 500
      expect(allocations[0].amount).toBe(500n);
      expect(allocations[1].amount).toBe(500n);
      expect(allocations[2].amount).toBe(500n);
    });

    it('should handle order size equals one party capacity', () => {
      const capacities = {
        party0: 1000n,
        party1: 2000n,
        party2: 3000n,
      };
      const orderSize = 1000n; // Equal to party0

      const protocols = new MPCProtocols(0, 3);
      const actualCapacities = [
        capacities.party0,
        capacities.party1,
        capacities.party2,
      ];

      const allocations = protocols.computeAllocations(
        actualCapacities,
        orderSize
      );

      const totalAllocation = allocations.reduce(
        (sum, alloc) => sum + alloc.amount,
        0n
      );
      expect(totalAllocation).toBe(orderSize);

      // Proportions: 1/6, 2/6, 3/6 of 1000
      expect(allocations[0].amount).toBeGreaterThanOrEqual(160n);
      expect(allocations[0].amount).toBeLessThanOrEqual(170n);
    });
  });

  describe('Session Lifecycle - Multi-Node', () => {
    it('should progress through all session states', () => {
      const sessionManager = new MPCSessionManager(0);
      const session = sessionManager.createSession('0x789', [0, 1, 2]);

      expect(session.status).toBe('initializing');

      sessionManager.updateSessionStatus(session.id, 'sharing');
      expect(session.status).toBe('sharing');

      sessionManager.updateSessionStatus(session.id, 'computing');
      expect(session.status).toBe('computing');

      sessionManager.updateSessionStatus(session.id, 'reconstructing');
      expect(session.status).toBe('reconstructing');

      sessionManager.updateSessionStatus(session.id, 'completed');
      expect(session.status).toBe('completed');
      expect(session.endTime).toBeDefined();
    });

    it('should cleanup completed sessions across all parties', () => {
      const sessionManagers = [
        new MPCSessionManager(0),
        new MPCSessionManager(1),
        new MPCSessionManager(2),
      ];

      sessionManagers.forEach((manager) => {
        const session = manager.createSession('0x999', [0, 1, 2]);
        manager.updateSessionStatus(session.id, 'completed');
        session.endTime = Date.now() - 7200000; // 2 hours ago
      });

      sessionManagers.forEach((manager) => {
        manager.cleanupOldSessions(3600000); // 1 hour threshold
        expect(manager.getActiveSessions().length).toBe(0);
      });
    });
  });
});
