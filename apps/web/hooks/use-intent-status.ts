"use client"

import type { Hex } from "viem"
import { useChainId, useReadContract, useWatchContractEvent } from "wagmi"
import { INTENT_REGISTRY } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { intentRegistryAbi } from "#/lib/abis/intent-registry"

export function useIntentStatus(intentId: Hex | null) {
	const chainId = useChainId() as SupportedChainId
	const registryAddress = INTENT_REGISTRY[chainId]

	const { data: intentData, refetch } = useReadContract({
		address: registryAddress,
		abi: intentRegistryAbi,
		functionName: "getIntent",
		args: intentId ? [intentId] : undefined,
		query: { enabled: !!intentId && !!registryAddress },
	})

	useWatchContractEvent({
		address: registryAddress,
		abi: intentRegistryAbi,
		eventName: "IntentFilled",
		args: intentId ? { intentId } : undefined,
		enabled: !!intentId && !!registryAddress,
		onLogs: () => {
			refetch()
		},
	})

	return { intentData, refetch }
}
