/**
 * Unit tests for finite field arithmetic
 */

import { describe, it, expect } from 'vitest';
import {
  FIELD_PRIME,
  fieldAdd,
  fieldSub,
  fieldMul,
  fieldDiv,
  mod,
  modInverse,
  modPow,
  randomFieldElement,
  fieldCompare,
  fieldGte,
} from '../../src/crypto/field.js';

describe('Field Arithmetic', () => {
  describe('mod', () => {
    it('should handle positive numbers', () => {
      expect(mod(10n, 7n)).toBe(3n);
      expect(mod(21n, 7n)).toBe(0n);
    });

    it('should handle negative numbers correctly', () => {
      expect(mod(-3n, 7n)).toBe(4n);
      expect(mod(-10n, 7n)).toBe(4n);
    });

    it('should handle zero', () => {
      expect(mod(0n, 7n)).toBe(0n);
    });
  });

  describe('fieldAdd', () => {
    it('should add two numbers in the field', () => {
      const a = 100n;
      const b = 200n;
      const result = fieldAdd(a, b);
      expect(result).toBe(300n);
    });

    it('should handle overflow with modulo', () => {
      const a = FIELD_PRIME - 10n;
      const b = 20n;
      const result = fieldAdd(a, b);
      expect(result).toBe(10n); // Wraps around
    });

    it('should be commutative', () => {
      const a = 12345n;
      const b = 67890n;
      expect(fieldAdd(a, b)).toBe(fieldAdd(b, a));
    });

    it('should be associative', () => {
      const a = 100n;
      const b = 200n;
      const c = 300n;
      const result1 = fieldAdd(fieldAdd(a, b), c);
      const result2 = fieldAdd(a, fieldAdd(b, c));
      expect(result1).toBe(result2);
    });
  });

  describe('fieldSub', () => {
    it('should subtract two numbers in the field', () => {
      const a = 300n;
      const b = 100n;
      const result = fieldSub(a, b);
      expect(result).toBe(200n);
    });

    it('should handle underflow with modulo', () => {
      const a = 10n;
      const b = 20n;
      const result = fieldSub(a, b);
      expect(result).toBe(FIELD_PRIME - 10n);
    });

    it('should satisfy: a - b + b = a', () => {
      const a = 12345n;
      const b = 67890n;
      const diff = fieldSub(a, b);
      const sum = fieldAdd(diff, b);
      expect(sum).toBe(a);
    });
  });

  describe('fieldMul', () => {
    it('should multiply two numbers in the field', () => {
      const a = 100n;
      const b = 200n;
      const result = fieldMul(a, b);
      expect(result).toBe(20000n);
    });

    it('should handle large products with modulo', () => {
      const a = FIELD_PRIME - 1n;
      const b = 2n;
      const result = fieldMul(a, b);
      expect(result < FIELD_PRIME).toBe(true);
    });

    it('should be commutative', () => {
      const a = 12345n;
      const b = 67890n;
      expect(fieldMul(a, b)).toBe(fieldMul(b, a));
    });

    it('should be associative', () => {
      const a = 100n;
      const b = 200n;
      const c = 300n;
      const result1 = fieldMul(fieldMul(a, b), c);
      const result2 = fieldMul(a, fieldMul(b, c));
      expect(result1).toBe(result2);
    });

    it('should distribute over addition', () => {
      const a = 100n;
      const b = 200n;
      const c = 300n;
      const left = fieldMul(a, fieldAdd(b, c));
      const right = fieldAdd(fieldMul(a, b), fieldMul(a, c));
      expect(left).toBe(right);
    });
  });

  describe('modInverse', () => {
    it('should compute modular inverse', () => {
      const a = 7n;
      const m = 11n;
      const inv = modInverse(a, m);
      expect(mod(a * inv, m)).toBe(1n);
    });

    it('should work with large numbers', () => {
      const a = 12345n;
      const inv = modInverse(a, FIELD_PRIME);
      expect(fieldMul(a, inv)).toBe(1n);
    });

    it('should throw for non-invertible elements', () => {
      expect(() => modInverse(6n, 12n)).toThrow();
    });
  });

  describe('fieldDiv', () => {
    it('should divide two numbers in the field', () => {
      const a = 100n;
      const b = 5n;
      const result = fieldDiv(a, b);
      expect(fieldMul(result, b)).toBe(a);
    });

    it('should satisfy: (a / b) * b = a', () => {
      const a = 12345n;
      const b = 678n;
      const quotient = fieldDiv(a, b);
      const product = fieldMul(quotient, b);
      expect(product).toBe(a);
    });

    it('should handle division by one', () => {
      const a = 12345n;
      expect(fieldDiv(a, 1n)).toBe(a);
    });
  });

  describe('modPow', () => {
    it('should compute modular exponentiation', () => {
      const base = 2n;
      const exp = 10n;
      const mod = 1000n;
      const result = modPow(base, exp, mod);
      expect(result).toBe(24n); // 2^10 = 1024, 1024 % 1000 = 24
    });

    it('should handle zero exponent', () => {
      const base = 12345n;
      const result = modPow(base, 0n, FIELD_PRIME);
      expect(result).toBe(1n);
    });

    it('should handle large exponents efficiently', () => {
      const base = 2n;
      const exp = 1000n;
      const result = modPow(base, exp, FIELD_PRIME);
      expect(result < FIELD_PRIME).toBe(true);
    });
  });

  describe('randomFieldElement', () => {
    it('should generate random elements within the field', () => {
      for (let i = 0; i < 10; i++) {
        const random = randomFieldElement();
        expect(random >= 0n).toBe(true);
        expect(random < FIELD_PRIME).toBe(true);
      }
    });

    it('should generate different values', () => {
      const values = new Set<bigint>();
      for (let i = 0; i < 100; i++) {
        values.add(randomFieldElement());
      }
      // Should have many unique values (not all 100 due to birthday paradox, but most)
      expect(values.size).toBeGreaterThan(95);
    });
  });

  describe('fieldCompare', () => {
    it('should return -1 when a < b', () => {
      expect(fieldCompare(5n, 10n)).toBe(-1);
    });

    it('should return 0 when a = b', () => {
      expect(fieldCompare(10n, 10n)).toBe(0);
    });

    it('should return 1 when a > b', () => {
      expect(fieldCompare(10n, 5n)).toBe(1);
    });
  });

  describe('fieldGte', () => {
    it('should return true when a >= b', () => {
      expect(fieldGte(10n, 5n)).toBe(true);
      expect(fieldGte(10n, 10n)).toBe(true);
    });

    it('should return false when a < b', () => {
      expect(fieldGte(5n, 10n)).toBe(false);
    });
  });

  describe('Field Properties', () => {
    it('should have additive identity (0)', () => {
      const a = 12345n;
      expect(fieldAdd(a, 0n)).toBe(a);
    });

    it('should have multiplicative identity (1)', () => {
      const a = 12345n;
      expect(fieldMul(a, 1n)).toBe(a);
    });

    it('should have additive inverse', () => {
      const a = 12345n;
      const negA = fieldSub(0n, a);
      expect(fieldAdd(a, negA)).toBe(0n);
    });

    it('should have multiplicative inverse for non-zero elements', () => {
      const a = 12345n;
      const invA = modInverse(a, FIELD_PRIME);
      expect(fieldMul(a, invA)).toBe(1n);
    });
  });
});
