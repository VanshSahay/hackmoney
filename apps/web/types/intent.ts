import type { Address, Hex } from "viem"

export type IntentPhase =
	| "idle"
	| "approving"
	| "submitting"
	| "submitted"
	| "processing"
	| "settling"
	| "filled"
	| "failed"

export interface IntentState {
	phase: IntentPhase
	tokenIn: Address | null
	tokenOut: Address | null
	amountIn: bigint | null
	amountOut: bigint | null
	intentId: Hex | null
	txHash: Hex | null
	settlementTxHash: Hex | null
	error: string | null
}

export const INITIAL_INTENT_STATE: IntentState = {
	phase: "idle",
	tokenIn: null,
	tokenOut: null,
	amountIn: null,
	amountOut: null,
	intentId: null,
	txHash: null,
	settlementTxHash: null,
	error: null,
}
