"use client"

import type { Address } from "viem"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { INTENT_REGISTRY } from "#/config/contracts"
import type { SupportedChainId } from "#/config/wagmi"
import { intentRegistryAbi } from "#/lib/abis/intent-registry"

export function useSwap() {
	const { writeContractAsync, data: hash, isPending } = useWriteContract()
	const {
		isLoading: isConfirming,
		isSuccess,
		data: receipt,
	} = useWaitForTransactionReceipt({ hash })

	async function swap(
		chainId: SupportedChainId,
		tokenIn: Address,
		tokenOut: Address,
		amount: bigint,
	) {
		const registryAddress = INTENT_REGISTRY[chainId]
		if (!registryAddress) throw new Error("No registry on this chain")

		return writeContractAsync({
			address: registryAddress,
			abi: intentRegistryAbi,
			functionName: "createIntent",
			args: [tokenIn, tokenOut, amount],
		})
	}

	return { swap, hash, isPending, isConfirming, isSuccess, receipt }
}
