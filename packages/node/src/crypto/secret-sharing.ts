/**
 * Secret sharing schemes for MPC
 * Implements 3-party Replicated Secret Sharing (RSS)
 */

import { FIELD_PRIME, fieldAdd, fieldSub, mod, randomFieldElement } from './field.js';
import type { Share, SecretValue, ReplicatedShares } from '../types.js';

// Re-export types for convenience
export type { ReplicatedShares } from '../types.js';

/**
 * 3-Party Replicated Secret Sharing
 * 
 * For a secret x, we create 3 shares: x1, x2, x3 such that:
 * x = x1 + x2 + x3 (mod p)
 * 
 * Distribution:
 * - Party 0 holds: (x1, x2)
 * - Party 1 holds: (x2, x3)
 * - Party 2 holds: (x3, x1)
 * 
 * This allows any 2 parties to reconstruct, but no single party learns x.
 */

export interface ThreePartyShares {
  share1: Share;
  share2: Share;
  share3: Share;
}

/**
 * Secret share a value into 3 shares
 */
export function secretShare3Party(
  secret: SecretValue,
  prime: bigint = FIELD_PRIME
): ThreePartyShares {
  // Generate two random shares
  const share1 = randomFieldElement(prime);
  const share2 = randomFieldElement(prime);
  
  // Third share is determined to ensure sum = secret
  const share3 = fieldSub(secret, fieldAdd(share1, share2, prime), prime);
  
  return { share1, share2, share3 };
}

/**
 * Reconstruct a secret from 3 shares
 */
export function reconstruct3Party(
  shares: ThreePartyShares,
  prime: bigint = FIELD_PRIME
): SecretValue {
  return fieldAdd(
    fieldAdd(shares.share1, shares.share2, prime),
    shares.share3,
    prime
  );
}

/**
 * Get the shares for a specific party in replicated secret sharing
 */
export function getPartyShares(
  allShares: ThreePartyShares,
  partyId: number
): ReplicatedShares {
  const { share1, share2, share3 } = allShares;
  
  switch (partyId) {
    case 0:
      return { share1: share1, share2: share2 };
    case 1:
      return { share1: share2, share2: share3 };
    case 2:
      return { share1: share3, share2: share1 };
    default:
      throw new Error(`Invalid party ID: ${partyId}. Must be 0, 1, or 2.`);
  }
}

/**
 * Reconstruct from replicated shares held by 2 parties
 */
export function reconstructFromTwoParties(
  party1Shares: ReplicatedShares,
  party2Shares: ReplicatedShares,
  party1Id: number,
  party2Id: number,
  prime: bigint = FIELD_PRIME
): SecretValue {
  // Each party has 2 shares, together they have all 3 with a known overlap
  const p1 = ((party1Id % 3) + 3) % 3;
  const p2 = ((party2Id % 3) + 3) % 3;
  
  if (p1 === p2) {
    throw new Error('Invalid reconstruction: parties must be different');
  }
  
  const sharesById = new Map<number, ReplicatedShares>([
    [p1, party1Shares],
    [p2, party2Shares],
  ]);
  
  let share1: bigint;
  let share2: bigint;
  let share3: bigint;
  
  if ((p1 === 0 && p2 === 1) || (p1 === 1 && p2 === 0)) {
    const s0 = sharesById.get(0)!;
    const s1 = sharesById.get(1)!;
    // Party 0: (x1, x2), Party 1: (x2, x3)
    share1 = s0.share1;
    share2 = s0.share2;
    share3 = s1.share2;
    
    if (s0.share2 !== s1.share1) {
      console.warn('Reconstruction overlap mismatch for parties 0 and 1');
    }
  } else if ((p1 === 1 && p2 === 2) || (p1 === 2 && p2 === 1)) {
    const s1 = sharesById.get(1)!;
    const s2 = sharesById.get(2)!;
    // Party 1: (x2, x3), Party 2: (x3, x1)
    share1 = s2.share2;
    share2 = s1.share1;
    share3 = s1.share2;
    
    if (s1.share2 !== s2.share1) {
      console.warn('Reconstruction overlap mismatch for parties 1 and 2');
    }
  } else {
    const s0 = sharesById.get(0)!;
    const s2 = sharesById.get(2)!;
    // Party 0: (x1, x2), Party 2: (x3, x1)
    share1 = s0.share1;
    share2 = s0.share2;
    share3 = s2.share1;
    
    if (s0.share1 !== s2.share2) {
      console.warn('Reconstruction overlap mismatch for parties 0 and 2');
    }
  }
  
  return fieldAdd(fieldAdd(share1, share2, prime), share3, prime);
}

/**
 * Add two sets of shares (for local addition in MPC)
 */
export function addShares(
  sharesA: ReplicatedShares,
  sharesB: ReplicatedShares,
  prime: bigint = FIELD_PRIME
): ReplicatedShares {
  return {
    share1: fieldAdd(sharesA.share1, sharesB.share1, prime),
    share2: fieldAdd(sharesA.share2, sharesB.share2, prime),
  };
}

/**
 * Subtract two sets of shares
 */
export function subShares(
  sharesA: ReplicatedShares,
  sharesB: ReplicatedShares,
  prime: bigint = FIELD_PRIME
): ReplicatedShares {
  return {
    share1: fieldSub(sharesA.share1, sharesB.share1, prime),
    share2: fieldSub(sharesA.share2, sharesB.share2, prime),
  };
}

/**
 * Multiply shares by a public constant
 */
export function mulSharesByConstant(
  shares: ReplicatedShares,
  constant: bigint,
  prime: bigint = FIELD_PRIME
): ReplicatedShares {
  return {
    share1: mod(shares.share1 * constant, prime),
    share2: mod(shares.share2 * constant, prime),
  };
}

/**
 * Generate Beaver triple shares for secure multiplication
 * Beaver triple: (a, b, c) where c = a * b
 * 
 * In practice, these would be pre-generated in an offline phase.
 * For simplicity, we generate them on-demand here.
 */
export interface BeaverTriple {
  a: ReplicatedShares;
  b: ReplicatedShares;
  c: ReplicatedShares;
}

export function generateBeaverTriple(
  partyId: number,
  prime: bigint = FIELD_PRIME
): BeaverTriple {
  // Generate random values a and b
  const aValue = randomFieldElement(prime);
  const bValue = randomFieldElement(prime);
  const cValue = mod(aValue * bValue, prime);
  
  // Secret share them
  const aShares = secretShare3Party(aValue, prime);
  const bShares = secretShare3Party(bValue, prime);
  const cShares = secretShare3Party(cValue, prime);
  
  // Get this party's shares
  return {
    a: getPartyShares(aShares, partyId),
    b: getPartyShares(bShares, partyId),
    c: getPartyShares(cShares, partyId),
  };
}

/**
 * Shamir's Secret Sharing (for comparison to RSS)
 * Creates n shares with threshold t
 */
export interface ShamirShare {
  x: bigint; // x-coordinate (party identifier)
  y: bigint; // y-coordinate (share value)
}

/**
 * Create Shamir shares for a secret
 */
export function shamirShare(
  secret: SecretValue,
  threshold: number,
  numParties: number,
  prime: bigint = FIELD_PRIME
): ShamirShare[] {
  if (threshold > numParties) {
    throw new Error('Threshold cannot exceed number of parties');
  }
  
  // Generate random polynomial coefficients
  const coefficients = [secret]; // a0 = secret
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomFieldElement(prime));
  }
  
  // Evaluate polynomial at x = 1, 2, ..., n
  const shares: ShamirShare[] = [];
  for (let x = 1n; x <= BigInt(numParties); x++) {
    let y = 0n;
    for (let i = 0; i < coefficients.length; i++) {
      const term = mod(coefficients[i] * modPow(x, BigInt(i), prime), prime);
      y = fieldAdd(y, term, prime);
    }
    shares.push({ x, y });
  }
  
  return shares;
}

/**
 * Reconstruct secret from Shamir shares using Lagrange interpolation
 */
export function shamirReconstruct(
  shares: ShamirShare[],
  prime: bigint = FIELD_PRIME
): SecretValue {
  if (shares.length === 0) {
    throw new Error('Need at least one share to reconstruct');
  }
  
  let secret = 0n;
  
  for (let i = 0; i < shares.length; i++) {
    let numerator = 1n;
    let denominator = 1n;
    
    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        numerator = mod(numerator * mod(-shares[j].x, prime), prime);
        denominator = mod(
          denominator * mod(shares[i].x - shares[j].x, prime),
          prime
        );
      }
    }
    
    const lagrangeCoeff = mod(numerator * modInverse(denominator, prime), prime);
    const term = mod(shares[i].y * lagrangeCoeff, prime);
    secret = fieldAdd(secret, term, prime);
  }
  
  return secret;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

function modInverse(a: bigint, m: bigint): bigint {
  const a0 = mod(a, m);
  if (m === 1n) return 0n;
  let [oldR, r] = [a0, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR > 1n) {
    throw new Error(`${a} is not invertible mod ${m}`);
  }
  return mod(oldS, m);
}
