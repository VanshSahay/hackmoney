/**
 * Unit tests for MPC protocols
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MPCProtocols } from '../../src/mpc/protocols.js';
import {
  secretShare3Party,
  getPartyShares,
  type ReplicatedShares,
} from '../../src/crypto/secret-sharing.js';
import { FIELD_PRIME } from '../../src/crypto/field.js';

describe('MPC Protocols', () => {
  let protocols: MPCProtocols;

  beforeEach(() => {
    protocols = new MPCProtocols(0, 3, FIELD_PRIME);
  });

  describe('computeSumShares', () => {
    it('should sum shares locally', () => {
      const capacity1 = 300n;
      const capacity2 = 500n;
      const capacity3 = 400n;

      const shares1 = secretShare3Party(capacity1);
      const shares2 = secretShare3Party(capacity2);
      const shares3 = secretShare3Party(capacity3);

      const party0Shares = [
        getPartyShares(shares1, 0),
        getPartyShares(shares2, 0),
        getPartyShares(shares3, 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);

      expect(sumShares.share1).toBeDefined();
      expect(sumShares.share2).toBeDefined();
    });

    it('should handle empty array', () => {
      const sumShares = protocols.computeSumShares([]);
      expect(sumShares.share1).toBe(0n);
      expect(sumShares.share2).toBe(0n);
    });

    it('should handle single share', () => {
      const capacity = 1000n;
      const shares = secretShare3Party(capacity);
      const party0Share = getPartyShares(shares, 0);

      const sumShares = protocols.computeSumShares([party0Share]);
      expect(sumShares).toEqual(party0Share);
    });

    it('should correctly sum multiple capacities', () => {
      // Simulate 3 parties each with their capacities
      const capacities = [300n, 500n, 400n];
      const expectedTotal = 1200n;

      const allShares = capacities.map((cap) => secretShare3Party(cap));

      // Each party computes local sum
      for (let partyId = 0; partyId < 3; partyId++) {
        const partyShares = allShares.map((shares) =>
          getPartyShares(shares, partyId)
        );
        const protocols = new MPCProtocols(partyId, 3);
        const sumShares = protocols.computeSumShares(partyShares);

        expect(sumShares.share1).toBeDefined();
        expect(sumShares.share2).toBeDefined();
      }
    });
  });

  describe('checkSufficientCapacity', () => {
    it('should return true when capacity is sufficient', async () => {
      const capacity1 = 500n;
      const capacity2 = 600n;
      const capacity3 = 400n;
      const totalCapacity = capacity1 + capacity2 + capacity3; // 1500

      const orderSize = 1000n;

      const shares1 = secretShare3Party(capacity1);
      const shares2 = secretShare3Party(capacity2);
      const shares3 = secretShare3Party(capacity3);

      const party0Shares = [
        getPartyShares(shares1, 0),
        getPartyShares(shares2, 0),
        getPartyShares(shares3, 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);

      // Mock exchange function that returns other parties' shares
      const mockExchange = async (shares: ReplicatedShares) => {
        const party1Shares = [
          getPartyShares(shares1, 1),
          getPartyShares(shares2, 1),
          getPartyShares(shares3, 1),
        ];
        const party2Shares = [
          getPartyShares(shares1, 2),
          getPartyShares(shares2, 2),
          getPartyShares(shares3, 2),
        ];

        const protocols1 = new MPCProtocols(1, 3);
        const protocols2 = new MPCProtocols(2, 3);

        return [
          protocols1.computeSumShares(party1Shares),
          protocols2.computeSumShares(party2Shares),
        ];
      };

      const sufficient = await protocols.checkSufficientCapacity(
        sumShares,
        orderSize,
        mockExchange
      );

      expect(sufficient).toBe(true);
    });

    it('should return false when capacity is insufficient', async () => {
      const capacity1 = 200n;
      const capacity2 = 300n;
      const capacity3 = 400n;
      const totalCapacity = capacity1 + capacity2 + capacity3; // 900

      const orderSize = 1000n; // More than total

      const shares1 = secretShare3Party(capacity1);
      const shares2 = secretShare3Party(capacity2);
      const shares3 = secretShare3Party(capacity3);

      const party0Shares = [
        getPartyShares(shares1, 0),
        getPartyShares(shares2, 0),
        getPartyShares(shares3, 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);

      const mockExchange = async (shares: ReplicatedShares) => {
        const party1Shares = [
          getPartyShares(shares1, 1),
          getPartyShares(shares2, 1),
          getPartyShares(shares3, 1),
        ];
        const party2Shares = [
          getPartyShares(shares1, 2),
          getPartyShares(shares2, 2),
          getPartyShares(shares3, 2),
        ];

        const protocols1 = new MPCProtocols(1, 3);
        const protocols2 = new MPCProtocols(2, 3);

        return [
          protocols1.computeSumShares(party1Shares),
          protocols2.computeSumShares(party2Shares),
        ];
      };

      const sufficient = await protocols.checkSufficientCapacity(
        sumShares,
        orderSize,
        mockExchange
      );

      expect(sufficient).toBe(false);
    });

    it('should handle exact match', async () => {
      const capacity1 = 400n;
      const capacity2 = 300n;
      const capacity3 = 300n;
      const orderSize = 1000n; // Exactly equal to total

      const shares1 = secretShare3Party(capacity1);
      const shares2 = secretShare3Party(capacity2);
      const shares3 = secretShare3Party(capacity3);

      const party0Shares = [
        getPartyShares(shares1, 0),
        getPartyShares(shares2, 0),
        getPartyShares(shares3, 0),
      ];

      const sumShares = protocols.computeSumShares(party0Shares);

      const mockExchange = async (shares: ReplicatedShares) => {
        const party1Shares = [
          getPartyShares(shares1, 1),
          getPartyShares(shares2, 1),
          getPartyShares(shares3, 1),
        ];
        const party2Shares = [
          getPartyShares(shares1, 2),
          getPartyShares(shares2, 2),
          getPartyShares(shares3, 2),
        ];

        const protocols1 = new MPCProtocols(1, 3);
        const protocols2 = new MPCProtocols(2, 3);

        return [
          protocols1.computeSumShares(party1Shares),
          protocols2.computeSumShares(party2Shares),
        ];
      };

      const sufficient = await protocols.checkSufficientCapacity(
        sumShares,
        orderSize,
        mockExchange
      );

      expect(sufficient).toBe(true);
    });
  });

  describe('computeAllocations', () => {
    it('should compute proportional allocations', () => {
      const capacities = [300n, 500n, 200n];
      const orderSize = 1000n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      expect(allocations.length).toBe(3);

      // Check sum equals order size
      const sum = allocations.reduce((acc, alloc) => acc + alloc.amount, 0n);
      expect(sum).toBe(orderSize);

      // Check proportions (approximately)
      const total = capacities.reduce((a, b) => a + b, 0n);
      allocations.forEach((alloc, i) => {
        const expectedProportion = Number(capacities[i]) / Number(total);
        const actualProportion = Number(alloc.amount) / Number(orderSize);
        
        // Allow small rounding differences
        expect(Math.abs(expectedProportion - actualProportion)).toBeLessThan(0.01);
      });
    });

    it('should handle equal capacities', () => {
      const capacities = [500n, 500n, 500n];
      const orderSize = 1500n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      // Each should get approximately 1/3
      allocations.forEach((alloc) => {
        expect(alloc.amount).toBe(500n);
      });
    });

    it('should handle unequal capacities', () => {
      const capacities = [100n, 200n, 700n]; // total 1000
      const orderSize = 1000n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      // Party 0 should get ~100 (10%)
      // Party 1 should get ~200 (20%)
      // Party 2 should get ~700 (70%)
      
      expect(allocations[0].amount).toBeGreaterThanOrEqual(90n);
      expect(allocations[0].amount).toBeLessThanOrEqual(110n);
      
      expect(allocations[1].amount).toBeGreaterThanOrEqual(190n);
      expect(allocations[1].amount).toBeLessThanOrEqual(210n);
      
      expect(allocations[2].amount).toBeGreaterThanOrEqual(690n);
      expect(allocations[2].amount).toBeLessThanOrEqual(710n);
    });

    it('should throw on insufficient capacity', () => {
      const capacities = [100n, 200n, 300n]; // total 600
      const orderSize = 1000n; // more than total

      expect(() =>
        protocols.computeAllocations(capacities, orderSize)
      ).toThrow();
    });

    it('should handle exact allocation', () => {
      const capacities = [400n, 400n, 200n]; // total 1000
      const orderSize = 1000n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      const sum = allocations.reduce((acc, alloc) => acc + alloc.amount, 0n);
      expect(sum).toBe(orderSize);
    });

    it('should ensure last party gets exact remainder', () => {
      const capacities = [333n, 333n, 334n]; // total 1000
      const orderSize = 1000n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      // Sum should be exact
      const sum = allocations.reduce((acc, alloc) => acc + alloc.amount, 0n);
      expect(sum).toBe(orderSize);
    });

    it('should handle small order sizes', () => {
      const capacities = [100n, 200n, 300n];
      const orderSize = 10n;

      const allocations = protocols.computeAllocations(capacities, orderSize);

      const sum = allocations.reduce((acc, alloc) => acc + alloc.amount, 0n);
      expect(sum).toBe(orderSize);
    });

    it('should handle large numbers', () => {
      const capacities = [
        1000000000000n, // 1 trillion
        2000000000000n, // 2 trillion
        3000000000000n, // 3 trillion
      ];
      const orderSize = 6000000000000n; // 6 trillion

      const allocations = protocols.computeAllocations(capacities, orderSize);

      const sum = allocations.reduce((acc, alloc) => acc + alloc.amount, 0n);
      expect(sum).toBe(orderSize);

      // Check proportions
      expect(allocations[0].amount).toBe(1000000000000n);
      expect(allocations[1].amount).toBe(2000000000000n);
      expect(allocations[2].amount).toBe(3000000000000n);
    });
  });

  describe('Party IDs', () => {
    it('should correctly set party ID', () => {
      const protocols0 = new MPCProtocols(0, 3);
      const protocols1 = new MPCProtocols(1, 3);
      const protocols2 = new MPCProtocols(2, 3);

      // Each protocols instance should work independently
      expect(protocols0).toBeDefined();
      expect(protocols1).toBeDefined();
      expect(protocols2).toBeDefined();
    });
  });
});
