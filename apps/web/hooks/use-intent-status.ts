"use client"

import type { Hex } from "viem"
import { useChainId, useReadContract } from "wagmi"
import { INTENT_REGISTRY } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { IntentStatus, intentRegistryAbi } from "#/lib/abis/intent-registry"

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

	const { data: statusCode } = useReadContract({
		address: registryAddress,
		abi: intentRegistryAbi,
		functionName: "getIntentStatus",
		args: intentId ? [intentId] : undefined,
		query: { enabled: !!intentId && !!registryAddress },
	})

	const status =
		statusCode === IntentStatus.Filled
			? "filled"
			: statusCode === IntentStatus.Cancelled
				? "cancelled"
				: "pending"

	return { intentData, status, refetch }
}
