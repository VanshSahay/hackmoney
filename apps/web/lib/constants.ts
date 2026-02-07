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

/** Default slippage tolerance as basis points (50 = 0.5%) */
export const DEFAULT_SLIPPAGE_BPS = 50

/** Slippage options in basis points */
export const SLIPPAGE_OPTIONS = [10, 50, 100] as const // 0.1%, 0.5%, 1%

/** Default deadline in seconds (30 minutes) */
export const DEFAULT_DEADLINE_SECONDS = 30 * 60

/** Base Sepolia block explorer */
export const BLOCK_EXPLORER_URL = "https://sepolia.basescan.org"

/** Calculate minAmountOut from expected output and slippage (in bps) */
export function calculateMinAmountOut(
	expectedOut: bigint,
	slippageBps: number,
): bigint {
	return (expectedOut * BigInt(10000 - slippageBps)) / 10000n
}

/** Calculate deadline timestamp from seconds offset */
export function calculateDeadline(secondsFromNow: number): bigint {
	return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow)
}
