import { create } from "zustand"
import type { Address, Hex } from "viem"
import type { IntentPhase, IntentState } from "#/types/intent"
import { INITIAL_INTENT_STATE } from "#/types/intent"

interface IntentActions {
	setPhase: (phase: IntentPhase) => void
	setTokens: (tokenIn: Address, tokenOut: Address) => void
	setAmountIn: (amount: bigint) => void
	setAmountOut: (amount: bigint) => void
	setTxHash: (hash: Hex) => void
	setIntentId: (id: Hex) => void
	setSettlementTxHash: (hash: Hex) => void
	setError: (error: string) => void
	reset: () => void
}

export type IntentStore = IntentState & IntentActions

export const useIntentStore = create<IntentStore>((set) => ({
	...INITIAL_INTENT_STATE,

	setPhase: (phase) => set({ phase, error: null }),
	setTokens: (tokenIn, tokenOut) => set({ tokenIn, tokenOut }),
	setAmountIn: (amount) => set({ amountIn: amount }),
	setAmountOut: (amount) => set({ amountOut: amount }),
	setTxHash: (hash) => set({ txHash: hash }),
	setIntentId: (id) => set({ intentId: id }),
	setSettlementTxHash: (hash) => set({ settlementTxHash: hash }),
	setError: (error) => set({ phase: "failed", error }),
	reset: () => set(INITIAL_INTENT_STATE),
}))
