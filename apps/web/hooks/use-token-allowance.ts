"use client"

import type { Address } from "viem"
import { useReadContract } from "wagmi"
import { erc20Abi } from "#/lib/abis/erc20"
import { NATIVE_ETH } from "#/lib/constants"

export function useTokenAllowance(
	tokenAddress: Address | undefined,
	owner: Address | undefined,
	spender: Address | undefined
) {
	const isNative =
		tokenAddress?.toLowerCase() === NATIVE_ETH.toLowerCase()

	const { data: allowance, refetch } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "allowance",
		args: owner && spender ? [owner, spender] : undefined,
		query: {
			enabled: !!owner && !!spender && !!tokenAddress && !isNative,
		},
	})

	// Native ETH doesn't need approval — treat as max allowance
	return {
		allowance: isNative ? BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") : allowance,
		refetch,
	}
}
