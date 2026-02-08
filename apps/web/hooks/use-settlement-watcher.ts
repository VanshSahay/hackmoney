"use client"

import { useChainId, useWatchContractEvent } from "wagmi"
import { SETTLEMENT } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { intentRegistryAbi } from "#/lib/abis/intent-registry"
import { useIntentStore } from "#/stores/intent-store"

/**
 * Watches for IntentFilled events for the current user's intents.
 * Updates the Zustand store when an intent is filled.
 */
export function useSettlementWatcher() {
	const chainId = useChainId() as SupportedChainId
	const { txHash, phase, setPhase, setAmountOut, setSettlementTxHash } =
		useIntentStore()

	const settlementAddress = SETTLEMENT[chainId]
	const isWatching = !!txHash && phase === "processing" && !!settlementAddress

	useWatchContractEvent({
		address: settlementAddress,
		abi: intentRegistryAbi,
		eventName: "IntentFilled",
		enabled: isWatching,
		onLogs: (logs) => {
			for (const log of logs) {
				const args = log.args as {
					intentId?: `0x${string}`
					totalAmountOut?: bigint
					numNodes?: bigint
				}

				if (args.totalAmountOut !== undefined) {
					setPhase("settling")
					setAmountOut(args.totalAmountOut)

					if (log.transactionHash) {
						setSettlementTxHash(log.transactionHash)
					}

					// Short delay then mark as filled
					setTimeout(() => {
						setPhase("filled")
					}, 1000)
				}
			}
		},
	})
}
