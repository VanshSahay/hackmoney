/**
 * Uniswap Integration
 * Handles token swaps via Uniswap V3 to fulfill intents
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  parseAbi,
  type Chain,
  encodeAbiParameters,
  parseAbiParameters,
} from 'viem';
import { mainnet, sepolia, hardhat, base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';

/**
 * Uniswap V3 Router addresses by chain
 */
const UNISWAP_V3_ROUTER: Record<number, Address> = {
  1: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Mainnet
  11155111: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Sepolia
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481', // Base
  84532: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4', // Base Sepolia
  31337: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Hardhat/Anvil (use mainnet address for testing)
};

/**
 * ERC20 Token ABI
 */
const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]);

/**
 * Uniswap V3 SwapRouter ABI
 */
const SWAP_ROUTER_ABI = parseAbi([
  'struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }',
  'function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut)',
]);

/**
 * Uniswap Manager Configuration
 */
export interface UniswapConfig {
  rpcUrl: string;
  privateKey: Hash;
  chainId: number;
  routerAddress?: Address; // Optional: override default router
}

/**
 * Swap parameters
 */
export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline?: number; // Unix timestamp
  feeTier?: number; // 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
}

/**
 * Uniswap Manager
 * Handles token swaps via Uniswap V3
 */
export class UniswapManager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: PrivateKeyAccount;
  private routerAddress: Address;
  private chain: Chain;
  
  constructor({ rpcUrl, privateKey, chainId, routerAddress }: UniswapConfig) {
    this.account = privateKeyToAccount(privateKey);
    this.chain = this.getChain(chainId);
    
    // Use provided router or default for chain
    this.routerAddress = routerAddress || UNISWAP_V3_ROUTER[chainId];
    if (!this.routerAddress) {
      throw new Error(`No Uniswap V3 router configured for chain ${chainId}`);
    }
    
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(rpcUrl),
    }) as any;
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(rpcUrl),
    }) as any;
  }
  
  /**
   * Get chain configuration by ID
   */
  private getChain(chainId: number): Chain {
    switch (chainId) {
      case 1:
        return mainnet;
      case 11155111:
        return sepolia;
      case 31337:
        return hardhat;
      case 8453:
        return base;
      case 84532:
        return baseSepolia;
      default:
        return {
          id: chainId,
          name: 'Custom Chain',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [] },
            public: { http: [] },
          },
        } as Chain;
    }
  }
  
  /**
   * Execute a token swap via Uniswap V3
   */
  async swap(params: SwapParams): Promise<{ amountOut: bigint; txHash: Hash }> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      deadline = Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      feeTier = 3000, // 0.3% default
    } = params;
    
    console.log(`Swapping ${amountIn} of ${tokenIn} to ${tokenOut}`);
    
    // Check balance
    const balance = await this.getTokenBalance(tokenIn, this.account.address);
    if (balance < amountIn) {
      throw new Error(
        `Insufficient balance: have ${balance}, need ${amountIn}`
      );
    }
    
    // Approve router if needed
    await this.ensureApproval(tokenIn, this.routerAddress, amountIn);
    
    // Execute swap
    const swapParams = {
      tokenIn,
      tokenOut,
      fee: feeTier,
      recipient: this.account.address,
      deadline: BigInt(deadline),
      amountIn,
      amountOutMinimum: minAmountOut,
      sqrtPriceLimitX96: 0n, // No price limit
    };
    
    try {
      const hash = await this.walletClient.writeContract({
        address: this.routerAddress,
        abi: SWAP_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [swapParams],
        chain: this.chain,
        account: this.account,
      });
      
      console.log('Swap transaction submitted:', hash);
      
      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });
      
      console.log('Swap confirmed in block:', receipt.blockNumber);
      
      // Calculate amount out from logs
      const newBalance = await this.getTokenBalance(tokenOut, this.account.address);
      
      return {
        amountOut: newBalance, // Simplified - should parse logs for exact amount
        txHash: hash,
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }
  
  /**
   * Get token balance for an address
   */
  async getTokenBalance(token: Address, owner: Address): Promise<bigint> {
    try {
      const balance = await (this.publicClient.readContract as any)({
        address: token,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [owner],
      });
      return balance as bigint;
    } catch (error) {
      console.error(`Error getting balance for ${token}:`, error);
      return 0n;
    }
  }
  
  /**
   * Ensure token approval for spending
   */
  async ensureApproval(
    token: Address,
    spender: Address,
    amount: bigint
  ): Promise<void> {
    // Check current allowance
    const allowance = await (this.publicClient.readContract as any)({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, spender],
    });
    
    if (allowance >= amount) {
      console.log('Token already approved');
      return;
    }
    
    // Approve spending
    console.log(`Approving ${spender} to spend ${amount} of ${token}`);
    
    const hash = await this.walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
      chain: this.chain,
      account: this.account,
    });
    
    await this.publicClient.waitForTransactionReceipt({ hash });
    console.log('Approval confirmed');
  }
  
  /**
   * Get quote for a swap (estimate output amount)
   * Note: This is simplified. Production should use Quoter contract
   */
  async getQuote(
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    feeTier: number = 3000
  ): Promise<bigint> {
    // Simplified: Return 95% of input as estimate (5% slippage)
    // In production, use Uniswap Quoter contract for accurate quotes
    return (amountIn * 95n) / 100n;
  }
  
  /**
   * Get wallet address
   */
  getAddress(): Address {
    return this.account.address;
  }
}
