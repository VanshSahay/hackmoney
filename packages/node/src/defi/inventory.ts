/**
 * Token Inventory Manager
 * Manages node's token holdings and automatically swaps to fulfill intent requirements
 */

import type { Address } from 'viem';
import { UniswapV4Manager } from './uniswap_v4.js';

/**
 * Token holding information
 */
export interface TokenHolding {
  tokenAddress: Address;
  balance: bigint;
  lastUpdated: number;
}

/**
 * Inventory Manager Configuration
 */
export interface InventoryConfig {
  uniswapManager: UniswapV4Manager;
  defaultSlippage?: number; // Basis points (e.g., 500 = 5%)
}

/**
 * Token Inventory Manager
 * Tracks node's token balances and handles automatic swapping
 */
export class TokenInventoryManager {
  private uniswapManager: UniswapV4Manager;
  private holdings: Map<Address, TokenHolding> = new Map();
  private defaultSlippage: number;
  
  constructor({ uniswapManager, defaultSlippage = 500 }: InventoryConfig) {
    this.uniswapManager = uniswapManager;
    this.defaultSlippage = defaultSlippage; // 5% default
  }
  
  /**
   * Update token balance in inventory
   */
  async updateBalance(tokenAddress: Address): Promise<bigint> {
    const balance = await this.uniswapManager.getTokenBalance(
      tokenAddress,
      this.uniswapManager.getAddress()
    );
    
    this.holdings.set(tokenAddress.toLowerCase() as Address, {
      tokenAddress: tokenAddress.toLowerCase() as Address,
      balance,
      lastUpdated: Date.now(),
    });
    
    return balance;
  }
  
  /**
   * Get token balance (from cache or fetch)
   */
  async getBalance(tokenAddress: Address, forceRefresh = false): Promise<bigint> {
    const normalized = tokenAddress.toLowerCase() as Address;
    const holding = this.holdings.get(normalized);
    
    // If no holding or force refresh or stale (>30s), update
    if (
      !holding ||
      forceRefresh ||
      Date.now() - holding.lastUpdated > 30000
    ) {
      return await this.updateBalance(tokenAddress);
    }
    
    return holding.balance;
  }
  
  /**
   * Check if node has sufficient balance of a token
   */
  async hasBalance(tokenAddress: Address, amount: bigint): Promise<boolean> {
    const balance = await this.getBalance(tokenAddress);
    return balance >= amount;
  }
  
  /**
   * Get all token holdings
   */
  getHoldings(): TokenHolding[] {
    return Array.from(this.holdings.values());
  }
  
  /**
   * Find best token to swap from to fulfill requirement
   * Simple strategy: Use token with highest balance
   */
  async findSwapSource(
    targetToken: Address,
    targetAmount: bigint,
    excludeTokens: Address[] = []
  ): Promise<{ token: Address; balance: bigint } | null> {
    const normalized = targetToken.toLowerCase();
    const excludeNormalized = excludeTokens.map(t => t.toLowerCase());
    
    // Filter holdings to find potential source tokens
    const potentialSources = Array.from(this.holdings.values())
      .filter(
        h =>
          h.tokenAddress.toLowerCase() !== normalized &&
          !excludeNormalized.includes(h.tokenAddress.toLowerCase()) &&
          h.balance > 0n
      )
      .sort((a, b) => (a.balance > b.balance ? -1 : 1));
    
    return potentialSources.length > 0
      ? { token: potentialSources[0].tokenAddress, balance: potentialSources[0].balance }
      : null;
  }
  
  /**
   * Calculate amount needed to swap to get target output
   * Accounts for slippage and swap fees
   */
  calculateSwapInput(targetOutput: bigint, slippageBps: number = this.defaultSlippage): bigint {
    // Add slippage buffer: output * (1 + slippage/10000) / 0.997 (for 0.3% fee)
    const withSlippage = (targetOutput * BigInt(10000 + slippageBps)) / 10000n;
    const withFee = (withSlippage * 1000n) / 997n; // Account for 0.3% swap fee
    return withFee;
  }
  
  /**
   * Swap tokens to fulfill a requirement
   */
  async swapToFulfill(
    tokenIn: Address,
    tokenOut: Address,
    targetAmountOut: bigint,
    slippageBps?: number
  ): Promise<{ success: boolean; amountOut: bigint; txHash?: string }> {
    const slippage = slippageBps ?? this.defaultSlippage;
    
    console.log(`\n💱 Preparing swap to fulfill requirement:`);
    console.log(`  From: ${tokenIn}`);
    console.log(`  To: ${tokenOut}`);
    console.log(`  Target: ${targetAmountOut}`);
    
    // Check if we already have enough of the target token
    const currentBalance = await this.getBalance(tokenOut, true);
    if (currentBalance >= targetAmountOut) {
      console.log(`  ✅ Already have sufficient balance: ${currentBalance}`);
      return { success: true, amountOut: currentBalance };
    }
    
    // Calculate how much more we need
    const amountNeeded = targetAmountOut - currentBalance;
    console.log(`  Need to swap for: ${amountNeeded}`);
    
    // Calculate input amount with slippage
    const amountIn = this.calculateSwapInput(amountNeeded, slippage);
    
    // Check if we have enough input tokens
    const inputBalance = await this.getBalance(tokenIn, true);
    if (inputBalance < amountIn) {
      console.log(`  ❌ Insufficient ${tokenIn} balance: ${inputBalance} < ${amountIn}`);
      return { success: false, amountOut: 0n };
    }
    
    // Calculate minimum output with slippage tolerance
    const minAmountOut = (amountNeeded * BigInt(10000 - slippage)) / 10000n;
    
    try {
      // Execute swap
      const result = await this.uniswapManager.swap({
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10 minutes
      });
      
      // Update balances
      await this.updateBalance(tokenIn);
      await this.updateBalance(tokenOut);
      
      const finalBalance = await this.getBalance(tokenOut);
      
      console.log(`  ✅ Swap successful!`);
      console.log(`  Got: ${result.amountOut}`);
      console.log(`  New balance: ${finalBalance}`);
      console.log(`  Tx: ${result.txHash}`);
      
      return {
        success: true,
        amountOut: result.amountOut,
        txHash: result.txHash,
      };
    } catch (error) {
      console.error('  ❌ Swap failed:', error);
      return { success: false, amountOut: 0n };
    }
  }
  
  /**
   * Attempt to fulfill an intent requirement by swapping from any available token
   */
  async fulfillRequirement(
    targetToken: Address,
    targetAmount: bigint
  ): Promise<{ success: boolean; swappedFrom?: Address }> {
    console.log(`\n🎯 Attempting to fulfill requirement:`);
    console.log(`  Token: ${targetToken}`);
    console.log(`  Amount: ${targetAmount}`);
    
    // Check if we already have enough
    const currentBalance = await this.getBalance(targetToken, true);
    if (currentBalance >= targetAmount) {
      console.log(`  ✅ Already have sufficient balance`);
      return { success: true };
    }
    
    // Find best token to swap from
    const sourceToken = await this.findSwapSource(targetToken, targetAmount);
    
    if (!sourceToken) {
      console.log(`  ❌ No suitable source token found for swapping`);
      return { success: false };
    }
    
    console.log(`  Found source token: ${sourceToken.token} (balance: ${sourceToken.balance})`);
    
    // Attempt swap
    const result = await this.swapToFulfill(
      sourceToken.token,
      targetToken,
      targetAmount
    );
    
    return {
      success: result.success,
      swappedFrom: result.success ? sourceToken.token : undefined,
    };
  }
  
  /**
   * Display current inventory
   */
  displayInventory(): void {
    console.log('\n📦 Token Inventory:');
    if (this.holdings.size === 0) {
      console.log('  (empty)');
      return;
    }
    
    for (const holding of this.holdings.values()) {
      console.log(`  ${holding.tokenAddress}: ${holding.balance}`);
    }
  }
}
