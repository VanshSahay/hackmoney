/**
 * Uniswap v4 Integration
 * Handles token swaps via Universal Router + Permit2
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
} from 'viem';
import { mainnet, sepolia, hardhat, base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { Actions, V4Planner, type SwapExactInSingle } from '@uniswap/v4-sdk';
import { RoutePlanner, CommandType } from '@uniswap/universal-router-sdk';

const UNISWAP_V4_UNIVERSAL_ROUTER: Record<number, Address> = {
  1: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
  11155111: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
  8453: '0x6ff5693b99212da76ad316178a184ab56d299b43',
  84532: '0x492e6456d9528771018deb9e87ef7750ef184104',
  31337: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
};

const PERMIT2_ADDRESS: Record<number, Address> = {
  1: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  11155111: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  8453: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  84532: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  31337: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
};

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]);

const PERMIT2_ABI = parseAbi([
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
  'function allowance(address owner, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
]);

const UNIVERSAL_ROUTER_ABI = parseAbi([
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) external payable',
]);

const MAX_UINT128 = (1n << 128n) - 1n;
const MAX_UINT48 = (1n << 48n) - 1n;
const MAX_UINT48_NUMBER = Number(MAX_UINT48);
const MAX_UINT160 = (1n << 160n) - 1n;
const MAX_UINT256 = (1n << 256n) - 1n;

export interface UniswapV4Config {
  rpcUrl: string;
  privateKey: Hash;
  chainId: number;
  routerAddress?: Address;
  permit2Address?: Address;
  feeTier?: number; // default 3000
  tickSpacing?: number; // default 60
  hooks?: Address; // default 0x000...0
}

export interface SwapParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  minAmountOut: bigint;
  deadline?: number;
  feeTier?: number;
  tickSpacing?: number;
  hooks?: Address;
}

export class UniswapV4Manager {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: PrivateKeyAccount;
  private routerAddress: Address;
  private permit2Address: Address;
  private chain: Chain;
  private defaultFeeTier: number;
  private defaultTickSpacing: number;
  private defaultHooks: Address;
  
  constructor({
    rpcUrl,
    privateKey,
    chainId,
    routerAddress,
    permit2Address,
    feeTier = 3000,
    tickSpacing = 60,
    hooks,
  }: UniswapV4Config) {
    this.account = privateKeyToAccount(privateKey);
    this.chain = this.getChain(chainId);
    
    this.routerAddress = routerAddress || UNISWAP_V4_UNIVERSAL_ROUTER[chainId];
    this.permit2Address = permit2Address || PERMIT2_ADDRESS[chainId];
    
    if (!this.routerAddress || !this.permit2Address) {
      throw new Error(`Missing Uniswap v4 addresses for chain ${chainId}`);
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
    
    this.defaultFeeTier = feeTier;
    this.defaultTickSpacing = tickSpacing;
    this.defaultHooks = hooks || ('0x0000000000000000000000000000000000000000' as Address);
  }
  
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
          rpcUrls: { default: { http: [] }, public: { http: [] } },
        } as Chain;
    }
  }
  
  getAddress(): Address {
    return this.account.address;
  }
  
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

  async ensureApproval(token: Address, spender: Address, amount: bigint): Promise<void> {
    const allowance = await (this.publicClient.readContract as any)({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, spender],
    });
    
    if ((allowance as bigint) < amount) {
      await this.walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, MAX_UINT256],
        chain: this.chain,
        account: this.account,
      });
    }
  }
  
  private async ensurePermit2Approval(token: Address, amount: bigint): Promise<void> {
    // 1) Approve Permit2 on the token
    const allowance = await (this.publicClient.readContract as any)({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, this.permit2Address],
    });
    
    if ((allowance as bigint) < amount) {
      await this.walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [this.permit2Address, MAX_UINT256],
        chain: this.chain,
        account: this.account,
      });
    }
    
    // 2) Approve router via Permit2
    const permit2Allowance = await (this.publicClient.readContract as any)({
      address: this.permit2Address,
      abi: PERMIT2_ABI,
      functionName: 'allowance',
      args: [this.account.address, token, this.routerAddress],
    });
    
    const currentAmount = (permit2Allowance as any)[0] as bigint;
    if (currentAmount < amount) {
      const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
      await this.walletClient.writeContract({
        address: this.permit2Address,
        abi: PERMIT2_ABI,
        functionName: 'approve',
        args: [
          token,
          this.routerAddress,
          MAX_UINT160,
          expiration > MAX_UINT48_NUMBER ? MAX_UINT48_NUMBER : expiration,
        ],
        chain: this.chain,
        account: this.account,
      });
    }
  }
  
  private sortTokens(tokenA: Address, tokenB: Address): { token0: Address; token1: Address; zeroForOne: boolean } {
    const a = tokenA.toLowerCase();
    const b = tokenB.toLowerCase();
    if (a < b) {
      return { token0: tokenA, token1: tokenB, zeroForOne: true };
    }
    return { token0: tokenB, token1: tokenA, zeroForOne: false };
  }
  
  async swap(params: SwapParams): Promise<{ amountOut: bigint; txHash: Hash }> {
    const {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      deadline = Math.floor(Date.now() / 1000) + 60 * 10,
      feeTier = this.defaultFeeTier,
      tickSpacing = this.defaultTickSpacing,
      hooks = this.defaultHooks,
    } = params;
    
    console.log(`Swapping ${amountIn} of ${tokenIn} to ${tokenOut} via v4`);
    
    const balance = await this.getTokenBalance(tokenIn, this.account.address);
    if (balance < amountIn) {
      throw new Error(`Insufficient balance: have ${balance}, need ${amountIn}`);
    }
    
    await this.ensurePermit2Approval(tokenIn, amountIn);
    
    if (amountIn > MAX_UINT128 || minAmountOut > MAX_UINT128) {
      throw new Error('amountIn or minAmountOut exceeds uint128 range');
    }
    
    const { token0, token1, zeroForOne } = this.sortTokens(tokenIn, tokenOut);
    
    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: feeTier,
      tickSpacing,
      hooks,
    };
    
    const swapConfig: SwapExactInSingle = {
      poolKey,
      zeroForOne,
      amountIn: amountIn.toString(),
      amountOutMinimum: minAmountOut.toString(),
      hookData: '0x',
    };
    
    const v4Planner = new V4Planner();
    v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [swapConfig]);
    v4Planner.addAction(Actions.SETTLE_ALL, [swapConfig.poolKey.currency0, swapConfig.amountIn]);
    v4Planner.addAction(Actions.TAKE_ALL, [swapConfig.poolKey.currency1, swapConfig.amountOutMinimum]);
    
    const encodedActions = v4Planner.finalize();
    const routePlanner = new RoutePlanner();
    routePlanner.addCommand(CommandType.V4_SWAP, [encodedActions]);
    
    const preOutBalance = await this.getTokenBalance(tokenOut, this.account.address);
    
    const hash = await this.walletClient.writeContract({
      address: this.routerAddress,
      abi: UNIVERSAL_ROUTER_ABI,
      functionName: 'execute',
      args: [
        routePlanner.commands as `0x${string}`,
        routePlanner.inputs as readonly `0x${string}`[],
        BigInt(deadline),
      ],
      account: this.account,
      chain: this.chain,
    });
    
    console.log('Swap transaction submitted:', hash);
    
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    console.log('Swap confirmed in block:', receipt.blockNumber);
    
    const newBalance = await this.getTokenBalance(tokenOut, this.account.address);
    const amountOut = newBalance - preOutBalance;
    
    return {
      amountOut,
      txHash: hash,
    };
  }
}
