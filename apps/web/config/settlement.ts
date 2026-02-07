// Settlement Contract Integration
// Use this in your UI to interact with the Settlement contract

import { parseUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';

// Settlement contract address on Base Sepolia
export const SETTLEMENT_ADDRESS = '0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4' as const;

// Settlement contract ABI (minimal, only what's needed for UI)
export const SETTLEMENT_ABI = [
  {
    type: 'function',
    name: 'createIntent',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'intentId', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'cancelIntent',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'intentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getIntent',
    stateMutability: 'view',
    inputs: [{ name: 'intentId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'intentId', type: 'bytes32' },
          { name: 'user', type: 'address' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getIntentStatus',
    stateMutability: 'view',
    inputs: [{ name: 'intentId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'event',
    name: 'IntentCreated',
    inputs: [
      { name: 'intentId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'minAmountOut', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'IntentFilled',
    inputs: [
      { name: 'intentId', type: 'bytes32', indexed: true },
      { name: 'totalAmountOut', type: 'uint256', indexed: false },
      { name: 'numNodes', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'IntentCancelled',
    inputs: [
      { name: 'intentId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
    ],
  },
] as const;

// ERC20 ABI for approvals
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// React hook for creating intents
export function useCreateIntent() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const createIntent = async (params: {
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    amountIn: string; // In token units (e.g., "100" for 100 tokens)
    minAmountOut: string; // In token units
    deadline: number; // Unix timestamp
    decimalsIn?: number; // Token decimals (default 18)
  }) => {
    const { tokenIn, tokenOut, amountIn, minAmountOut, deadline, decimalsIn = 18 } = params;

    // Convert amounts to wei
    const amountInWei = parseUnits(amountIn, decimalsIn);
    const minAmountOutWei = parseUnits(minAmountOut, decimalsIn);

    // Call createIntent
    writeContract({
      address: SETTLEMENT_ADDRESS,
      abi: SETTLEMENT_ABI,
      functionName: 'createIntent',
      args: [tokenIn, tokenOut, amountInWei, minAmountOutWei, BigInt(deadline)],
    });
  };

  return {
    createIntent,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// React hook for approving tokens
export function useApproveToken() {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = async (tokenAddress: `0x${string}`, amount: string, decimals = 18) => {
    const amountWei = parseUnits(amount, decimals);

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SETTLEMENT_ADDRESS, amountWei],
    });
  };

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    hash,
  };
}

// Hook to watch for intent events
export function useWatchIntentEvents(onIntentCreated?: (log: any) => void) {
  const publicClient = usePublicClient();

  const watchIntents = () => {
    if (!publicClient) return;

    return publicClient.watchEvent({
      address: SETTLEMENT_ADDRESS,
      event: {
        type: 'event',
        name: 'IntentCreated',
        inputs: [
          { name: 'intentId', type: 'bytes32', indexed: true },
          { name: 'user', type: 'address', indexed: true },
          { name: 'tokenIn', type: 'address', indexed: false },
          { name: 'tokenOut', type: 'address', indexed: false },
          { name: 'amountIn', type: 'uint256', indexed: false },
          { name: 'minAmountOut', type: 'uint256', indexed: false },
          { name: 'deadline', type: 'uint256', indexed: false },
        ],
      },
      onLogs: (logs) => {
        logs.forEach((log) => {
          if (onIntentCreated) onIntentCreated(log);
        });
      },
    });
  };

  return { watchIntents };
}

// Example usage in a component:
/*
import { useCreateIntent, useApproveToken } from '@/config/settlement';

export function SwapComponent() {
  const { createIntent, isPending, isSuccess } = useCreateIntent();
  const { approve, isPending: isApproving } = useApproveToken();

  const handleSwap = async () => {
    // 1. First approve the token
    await approve(
      '0x...' as `0x${string}`, // tokenIn address
      '100', // amount
      18 // decimals
    );

    // 2. Then create the intent
    await createIntent({
      tokenIn: '0x...' as `0x${string}`,
      tokenOut: '0x...' as `0x${string}`,
      amountIn: '100',
      minAmountOut: '95',
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      decimalsIn: 18,
    });
  };

  return (
    <button onClick={handleSwap} disabled={isPending || isApproving}>
      {isApproving ? 'Approving...' : isPending ? 'Creating Intent...' : 'Swap'}
    </button>
  );
}
*/
