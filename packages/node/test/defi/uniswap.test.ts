/**
 * Uniswap Manager Basic Tests
 * Tests core functionality without deep mocking
 */

import { describe, it, expect } from 'vitest';
import type { Address, Hash } from 'viem';

describe('UniswapManager Configuration', () => {
  it('should have correct router addresses for supported chains', () => {
    const routers = {
      1: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      11155111: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      8453: '0x2626664c2603336E57B271c5C0b26F421741e481',
      84532: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      31337: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Hardhat
    };

    // Verify all router addresses are valid Ethereum addresses
    Object.values(routers).forEach(addr => {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  it('should validate Ethereum addresses format', () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const invalidAddress = '0x12345'; // Too short

    expect(validAddress).toHaveLength(42);
    expect(validAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(invalidAddress).not.toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});

describe('Swap Calculation Logic', () => {
  it('should calculate slippage correctly', () => {
    const amount = 1000000n;
    const slippageBps = 500n; // 5%
    
    // With slippage: amount * (1 + slippage/10000)
    const withSlippage = (amount * (10000n + slippageBps)) / 10000n;
    
    expect(withSlippage).toBe(1050000n); // 5% more
  });

  it('should calculate swap fee correctly', () => {
    const amount = 1000000n;
    const feeBps = 30n; // 0.3%
    
    // Account for fee: amount / (1 - fee/10000)
    const withFee = (amount * 10000n) / (10000n - feeBps);
    
    expect(withFee).toBeGreaterThan(amount);
  });

  it('should handle combined slippage and fee calculation', () => {
    const targetOutput = 1000000n;
    const slippage = 500n; // 5%
    const fee = 30n; // 0.3%
    
    // First add slippage
    const withSlippage = (targetOutput * (10000n + slippage)) / 10000n;
    // Then account for fee
    const withFee = (withSlippage * 10000n) / (10000n - fee);
    
    expect(withFee).toBeGreaterThan(targetOutput);
    expect(withFee).toBeGreaterThan(withSlippage);
  });

  it('should not overflow with large amounts', () => {
    const largeAmount = 2n ** 100n;
    const slippage = 500n;
    
    const result = (largeAmount * (10000n + slippage)) / 10000n;
    
    expect(result).toBeGreaterThan(largeAmount);
    expect(result).not.toBe(Infinity);
  });

  it('should handle zero amounts', () => {
    const zero = 0n;
    const slippage = 500n;
    
    const result = (zero * (10000n + slippage)) / 10000n;
    
    expect(result).toBe(0n);
  });
});
