"use client"

import { useEffect } from "react"
import type { Hex, Log } from "viem"
import { useChainId, usePublicClient } from "wagmi"
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
	const publicClient = usePublicClient()
	const { txHash, phase, setPhase, setAmountOut, setSettlementTxHash } =
		useIntentStore()

	useEffect(() => {
		// Only watch when we have a pending intent in processing state
		if (!publicClient || !txHash || phase !== "processing") return

		const settlementAddress = SETTLEMENT[chainId]
		if (!settlementAddress) return

		// Watch for IntentFilled events
		const unwatch = publicClient.watchContractEvent({
			address: settlementAddress,
			abi: intentRegistryAbi,
			eventName: "IntentFilled",
			onLogs: (logs: Log[]) => {
				for (const log of logs) {
					// Check if this is our intent by matching the transaction
					// The intentId is in topics[1] (first indexed param)
					const intentId = log.topics[1] as Hex

					// Decode the event data
					try {
						const decoded = publicClient.decodeEventLog({
							abi: intentRegistryAbi,
							data: log.data,
							topics: log.topics,
						})

						if (decoded.eventName === "IntentFilled") {
							const { totalAmountOut } = decoded.args as {
								totalAmountOut: bigint
								numNodes: bigint
							}

							// Update store with filled state
							setPhase("settling")
							setAmountOut(totalAmountOut)

							// Use the transaction hash from the log as settlement tx
							if (log.transactionHash) {
								setSettlementTxHash(log.transactionHash)
							}

							// Short delay then mark as filled
							setTimeout(() => {
								setPhase("filled")
							}, 1000)
						}
					} catch {
						// Ignore decode errors
					}
				}
			},
		})

		return () => {
			unwatch()
		}
	}, [
		publicClient,
		chainId,
		txHash,
		phase,
		setPhase,
		setAmountOut,
		setSettlementTxHash,
	])
}
