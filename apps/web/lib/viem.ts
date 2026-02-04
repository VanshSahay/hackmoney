import { createPublicClient, http, type Chain } from "viem"
import { base, baseSepolia } from "viem/chains"

const rpcUrls: Record<number, string | undefined> = {
	[base.id]: process.env.RPC_BASE,
	[baseSepolia.id]: process.env.RPC_BASE_SEPOLIA,
}

/** Server-side public client for any supported chain. Uses server-only env vars. */
export function getPublicClient(chain: Chain) {
	return createPublicClient({
		chain,
		transport: http(rpcUrls[chain.id]),
	})
}

export const baseClient = getPublicClient(base)
export const baseSepoliaClient = getPublicClient(baseSepolia)
