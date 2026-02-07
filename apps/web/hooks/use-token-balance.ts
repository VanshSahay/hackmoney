"use client"

import type { Address } from "viem"
import { useBalance, useReadContract } from "wagmi"
import { erc20Abi } from "#/lib/abis/erc20"
import { NATIVE_ETH } from "#/lib/constants"

export function useTokenBalance(
	tokenAddress: Address | undefined,
	account: Address | undefined,
) {
	const isNative = tokenAddress?.toLowerCase() === NATIVE_ETH.toLowerCase()

	const { data: nativeBalance } = useBalance({
		address: account,
		query: { enabled: !!account && isNative },
	})

	const { data: erc20Balance, refetch } = useReadContract({
		address: tokenAddress,
		abi: erc20Abi,
		functionName: "balanceOf",
		args: account ? [account] : undefined,
		query: { enabled: !!account && !!tokenAddress && !isNative },
	})

	const balance = isNative ? nativeBalance?.value : erc20Balance

	return { balance, refetch }
}
