import type { Address } from "viem"
import type { SupportedChainId } from "#/config/wagmi"

export interface Token {
	symbol: string
	name: string
	decimals: number
	logoURI?: string
	addresses: Partial<Record<SupportedChainId, Address>>
}

export interface TokenAmount {
	token: Token
	amount: bigint
}
