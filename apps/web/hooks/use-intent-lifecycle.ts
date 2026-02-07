"use client"

import { useCallback } from "react"
import type { Address } from "viem"
import { useChainId } from "wagmi"
import { INTENT_REGISTRY } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { useApproveToken } from "#/hooks/use-approve-token"
import { useMockSettlement } from "#/hooks/use-mock-settlement"
import { useSwap } from "#/hooks/use-swap"
import { useIntentStore } from "#/stores/intent-store"

export function useIntentLifecycle() {
	const chainId = useChainId() as SupportedChainId
	const store = useIntentStore()
	const { approve } = useApproveToken()
	const { swap } = useSwap()
	const { startMockSettlement } = useMockSettlement()

	const execute = useCallback(
		async (
			tokenIn: Address,
			tokenOut: Address,
			amount: bigint,
			needsApproval: boolean,
		) => {
			try {
				store.reset()
				store.setTokens(tokenIn, tokenOut)
				store.setAmountIn(amount)

				const spender = INTENT_REGISTRY[chainId]
				if (!spender) throw new Error("No registry on this chain")

				// Step 1: Approve if needed
				if (needsApproval) {
					store.setPhase("approving")
					await approve(tokenIn, spender, amount)
				}

				// Step 2: Submit intent
				store.setPhase("submitting")
				const txHash = await swap(chainId, tokenIn, tokenOut, amount)
				store.setTxHash(txHash)
				store.setPhase("submitted")

				// Step 3: For demo, use mock settlement
				// In production, we'd watch for IntentFilled events
				// Extract intentId from tx receipt logs (mock for now)
				const mockIntentId = txHash // Use txHash as mock intentId
				store.setIntentId(mockIntentId)

				startMockSettlement()
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Transaction failed"
				store.setError(message)
			}
		},
		[chainId, approve, swap, startMockSettlement, store],
	)

	return { execute }
}
