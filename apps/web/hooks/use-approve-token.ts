"use client"

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { erc20Abi } from "#/lib/abis/erc20"
import type { Address } from "viem"

export function useApproveToken() {
	const { writeContractAsync, data: hash, isPending } = useWriteContract()
	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

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
