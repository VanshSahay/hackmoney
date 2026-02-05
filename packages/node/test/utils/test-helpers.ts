/**
 * Test Utilities and Helpers
 */

import {
  secretShare3Party,
  getPartyShares,
  type ReplicatedShares,
  type ThreePartyShares,
} from '../../src/crypto/secret-sharing.js';
import type { PartyId, Allocation } from '../../src/types.js';

/**
 * Create mock party configuration
 */
export function createMockPartyConfig(partyId: PartyId, port: number = 3000) {
  return {
    id: partyId,
    address: 'localhost',
    port: port + partyId,
  };
}

/**
 * Create multiple mock party configurations
 */
export function createMockParties(numParties: number = 3, startPort: number = 3000) {
  return Array.from({ length: numParties }, (_, i) =>
    createMockPartyConfig(i, startPort)
  );
}

/**
 * Simulate share distribution across parties
 * Returns a map of partyId -> shares they receive
 */
export function simulateShareDistribution(
  secrets: bigint[],
  numParties: number = 3
): Map<PartyId, ReplicatedShares[]> {
  const allShares = secrets.map((secret) => secretShare3Party(secret));
  const partyShares = new Map<PartyId, ReplicatedShares[]>();

  for (let partyId = 0; partyId < numParties; partyId++) {
    const shares = allShares.map((shares) => getPartyShares(shares, partyId));
    partyShares.set(partyId, shares);
  }

  return partyShares;
}

/**
 * Generate random capacity values
 */
export function generateRandomCapacities(
  numParties: number,
  min: number = 100,
  max: number = 1000
): bigint[] {
  return Array.from(
    { length: numParties },
    () => BigInt(Math.floor(Math.random() * (max - min + 1)) + min)
  );
}

/**
 * Verify allocation properties
 */
export function verifyAllocations(
  allocations: Allocation[],
  expectedTotal: bigint,
  capacities: bigint[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check count
  if (allocations.length !== capacities.length) {
    errors.push(
      `Wrong number of allocations: expected ${capacities.length}, got ${allocations.length}`
    );
  }

  // Check sum
  const totalAllocation = allocations.reduce(
    (sum, alloc) => sum + alloc.amount,
    0n
  );
  if (totalAllocation !== expectedTotal) {
    errors.push(
      `Total allocation mismatch: expected ${expectedTotal}, got ${totalAllocation}`
    );
  }

  // Check no negative allocations
  allocations.forEach((alloc, i) => {
    if (alloc.amount < 0n) {
      errors.push(`Negative allocation for party ${i}: ${alloc.amount}`);
    }
  });

  // Check party IDs match
  allocations.forEach((alloc, i) => {
    if (alloc.partyId !== i) {
      errors.push(`Party ID mismatch at index ${i}: expected ${i}, got ${alloc.partyId}`);
    }
  });

  // Check proportionality (roughly)
  const totalCapacity = capacities.reduce((sum, cap) => sum + cap, 0n);
  if (totalCapacity >= expectedTotal) {
    allocations.forEach((alloc, i) => {
      const expectedProportion = Number(capacities[i]) / Number(totalCapacity);
      const expectedAllocation = BigInt(
        Math.floor(Number(expectedTotal) * expectedProportion)
      );
      const actualAllocation = alloc.amount;
      const diff = actualAllocation > expectedAllocation
        ? actualAllocation - expectedAllocation
        : expectedAllocation - actualAllocation;
      
      // Allow 2% deviation for rounding
      const tolerance = (expectedTotal * 2n) / 100n;
      if (diff > tolerance) {
        errors.push(
          `Allocation proportion off for party ${i}: expected ~${expectedAllocation}, got ${actualAllocation}`
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create mock intent
 */
export function createMockIntent(
  intentId: string,
  amountIn: bigint,
  tokenIn: string = '0x123',
  tokenOut: string = '0x456'
) {
  return {
    id: intentId,
    tokenIn,
    tokenOut,
    amountIn,
    minAmountOut: (amountIn * 99n) / 100n, // 1% slippage
    user: '0x789',
    deadline: BigInt(Date.now() + 3600000), // 1 hour
    timestamp: Date.now(),
    status: 'pending' as const,
  };
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Calculate expected allocations (for testing)
 */
export function calculateExpectedAllocations(
  capacities: bigint[],
  orderSize: bigint
): bigint[] {
  const total = capacities.reduce((sum, cap) => sum + cap, 0n);
  
  if (total < orderSize) {
    throw new Error('Insufficient total capacity');
  }
  
  const allocations: bigint[] = [];
  let allocatedSum = 0n;
  
  for (let i = 0; i < capacities.length; i++) {
    if (i === capacities.length - 1) {
      // Last party gets remainder
      allocations.push(orderSize - allocatedSum);
    } else {
      const allocation = (capacities[i] * orderSize) / total;
      allocations.push(allocation);
      allocatedSum += allocation;
    }
  }
  
  return allocations;
}

/**
 * Compare bigints with tolerance
 */
export function approximatelyEqual(
  a: bigint,
  b: bigint,
  tolerancePercent: number = 1
): boolean {
  const diff = a > b ? a - b : b - a;
  const tolerance = (b * BigInt(tolerancePercent)) / 100n;
  return diff <= tolerance;
}

/**
 * Generate test scenario
 */
export interface TestScenario {
  name: string;
  capacities: bigint[];
  orderSize: bigint;
  shouldSucceed: boolean;
}

export function generateTestScenarios(): TestScenario[] {
  return [
    {
      name: 'Sufficient capacity - equal split',
      capacities: [500n, 500n, 500n],
      orderSize: 1500n,
      shouldSucceed: true,
    },
    {
      name: 'Sufficient capacity - unequal split',
      capacities: [300n, 500n, 400n],
      orderSize: 1000n,
      shouldSucceed: true,
    },
    {
      name: 'Insufficient capacity',
      capacities: [200n, 300n, 200n],
      orderSize: 1000n,
      shouldSucceed: false,
    },
    {
      name: 'Exact capacity match',
      capacities: [400n, 300n, 300n],
      orderSize: 1000n,
      shouldSucceed: true,
    },
    {
      name: 'One party with zero capacity',
      capacities: [0n, 600n, 400n],
      orderSize: 1000n,
      shouldSucceed: true,
    },
    {
      name: 'Very small order',
      capacities: [1000n, 2000n, 3000n],
      orderSize: 10n,
      shouldSucceed: true,
    },
    {
      name: 'Large numbers',
      capacities: [1000000000n, 2000000000n, 3000000000n],
      orderSize: 6000000000n,
      shouldSucceed: true,
    },
  ];
}

/**
 * Create mock settlement signature
 */
export function createMockSettlementSignature(
  partyId: PartyId,
  intentId: string,
  amount: bigint
) {
  return {
    partyId,
    intentId,
    amount,
    signature: `0x${partyId.toString(16).padStart(64, '0')}${intentId.slice(2)}`,
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
