/**
 * Finite field arithmetic operations
 * All operations are performed modulo a large prime
 */

/**
 * Large prime for field operations (256-bit Mersenne prime)
 * P = 2^256 - 189
 */
export const FIELD_PRIME = 2n ** 256n - 189n;

/**
 * Modular addition
 */
export function fieldAdd(a: bigint, b: bigint, prime: bigint = FIELD_PRIME): bigint {
  return mod(a + b, prime);
}

/**
 * Modular subtraction
 */
export function fieldSub(a: bigint, b: bigint, prime: bigint = FIELD_PRIME): bigint {
  return mod(a - b, prime);
}

/**
 * Modular multiplication
 */
export function fieldMul(a: bigint, b: bigint, prime: bigint = FIELD_PRIME): bigint {
  return mod(a * b, prime);
}

/**
 * Modular division (a / b mod p)
 * Implemented as a * b^(-1) mod p
 */
export function fieldDiv(a: bigint, b: bigint, prime: bigint = FIELD_PRIME): bigint {
  const bInv = modInverse(b, prime);
  return fieldMul(a, bInv, prime);
}

/**
 * Proper modulo operation (always returns positive result)
 */
export function mod(n: bigint, m: bigint): bigint {
  return ((n % m) + m) % m;
}

/**
 * Modular inverse using Extended Euclidean Algorithm
 * Returns x such that (a * x) mod m = 1
 */
export function modInverse(a: bigint, m: bigint): bigint {
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

/**
 * Modular exponentiation (base^exp mod m)
 * Uses binary exponentiation for efficiency
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  
  let result = 1n;
  base = base % mod;
  
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  
  return result;
}

/**
 * Generate a random field element
 */
export function randomFieldElement(prime: bigint = FIELD_PRIME): bigint {
  // Generate random bytes
  const bytes = new Uint8Array(32); // 256 bits
  crypto.getRandomValues(bytes);
  
  // Convert to bigint
  let randomValue = 0n;
  for (let i = 0; i < bytes.length; i++) {
    randomValue = (randomValue << 8n) | BigInt(bytes[i]);
  }
  
  // Reduce modulo prime
  return mod(randomValue, prime);
}

/**
 * Compare two field elements
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function fieldCompare(a: bigint, b: bigint): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if a >= b in the field
 */
export function fieldGte(a: bigint, b: bigint): boolean {
  return fieldCompare(a, b) >= 0;
}
