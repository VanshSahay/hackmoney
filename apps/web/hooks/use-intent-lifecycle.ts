"use client"

import { useCallback } from "react"
import type { Address } from "viem"
import { useChainId } from "wagmi"
import { INTENT_REGISTRY } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { useApproveToken } from "#/hooks/use-approve-token"
import { useSwap } from "#/hooks/use-swap"
import {
	calculateDeadline,
	calculateMinAmountOut,
	DEFAULT_DEADLINE_SECONDS,
	DEFAULT_SLIPPAGE_BPS,
} from "#/lib/constants"
import { useIntentStore } from "#/stores/intent-store"

interface ExecuteParams {
	tokenIn: Address
	tokenOut: Address
	amountIn: bigint
	expectedAmountOut: bigint
	needsApproval: boolean
	slippageBps?: number
	deadlineSeconds?: number
}

export function useIntentLifecycle() {
	const chainId = useChainId() as SupportedChainId
	const store = useIntentStore()
	const { approve } = useApproveToken()
	const { swap } = useSwap()

	const execute = useCallback(
		async ({
			tokenIn,
			tokenOut,
			amountIn,
			expectedAmountOut,
			needsApproval,
			slippageBps = DEFAULT_SLIPPAGE_BPS,
			deadlineSeconds = DEFAULT_DEADLINE_SECONDS,
		}: ExecuteParams) => {
			try {
				store.reset()
				store.setTokens(tokenIn, tokenOut)
				store.setAmountIn(amountIn)

				const spender = INTENT_REGISTRY[chainId]
				if (!spender) throw new Error("No registry on this chain")

				// Calculate minAmountOut and deadline
				const minAmountOut = calculateMinAmountOut(
					expectedAmountOut,
					slippageBps,
				)
				const deadline = calculateDeadline(deadlineSeconds)

				// Step 1: Approve if needed
				if (needsApproval) {
					store.setPhase("approving")
					await approve(tokenIn, spender, amountIn)
				}

				// Step 2: Submit intent
				store.setPhase("submitting")
				const txHash = await swap(
					chainId,
					tokenIn,
					tokenOut,
					amountIn,
					minAmountOut,
					deadline,
				)
				store.setTxHash(txHash)
				store.setPhase("submitted")

				// Transition to processing - settlement watcher handles filled transition
				store.setPhase("processing")
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Transaction failed"
				store.setError(message)
			}
		},
		[chainId, approve, swap, store],
	)

	return { execute }
}
