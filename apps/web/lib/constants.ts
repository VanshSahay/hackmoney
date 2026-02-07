import type { IntentPhase } from "#/types/intent"

export const PHASE_LABELS: Record<IntentPhase, string> = {
	idle: "Ready",
	approving: "Approving Token",
	submitting: "Submitting Intent",
	submitted: "Intent Submitted",
	processing: "Servers Computing",
	settling: "Settling",
	filled: "Filled",
	failed: "Failed",
}

export const PHASE_DESCRIPTIONS: Record<IntentPhase, string> = {
	idle: "Enter an amount and swap",
	approving: "Approve token spend in your wallet",
	submitting: "Confirm the swap transaction",
	submitted: "Transaction confirmed, waiting for MPC servers",
	processing: "MPC servers are privately computing optimal allocations",
	settling: "Settlement transaction being submitted on-chain",
	filled: "Swap completed successfully",
	failed: "Settlement failed — you can retry",
}

/** Mock settlement phase durations in ms */
export const MOCK_PHASE_DURATIONS: Partial<Record<IntentPhase, number>> = {
	submitted: 2000,
	processing: 3000,
	settling: 2000,
}

/** Native ETH sentinel address */
export const NATIVE_ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const
