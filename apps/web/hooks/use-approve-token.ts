"use client"

import type { Address } from "viem"
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi"
import { erc20Abi } from "#/lib/abis/erc20"

export function useApproveToken() {
	const { writeContractAsync, data: hash, isPending } = useWriteContract()
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash,
	})

	async function approve(token: Address, spender: Address, amount: bigint) {
		return writeContractAsync({
			address: token,
			abi: erc20Abi,
			functionName: "approve",
			args: [spender, amount],
		})
	}

	return { approve, hash, isPending, isConfirming, isSuccess }
}
