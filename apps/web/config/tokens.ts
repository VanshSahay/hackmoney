import { base, baseSepolia } from "wagmi/chains"
import type { Token } from "#/types/token"

export const TOKENS: Record<string, Token> = {
	USDC: {
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
		addresses: {
			[base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
			[baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
		},
	},
	ETH: {
		symbol: "ETH",
		name: "Ether",
		decimals: 18,
		addresses: {
			[base.id]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
			[baseSepolia.id]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
		},
	},
	WETH: {
		symbol: "WETH",
		name: "Wrapped Ether",
		decimals: 18,
		addresses: {
			[base.id]: "0x4200000000000000000000000000000000000006",
			[baseSepolia.id]: "0x4200000000000000000000000000000000000006",
		},
	},
}

export const TOKEN_LIST = Object.values(TOKENS)

/** Tokens available as input (sell) */
export const SELL_TOKENS = [TOKENS.USDC, TOKENS.WETH]

/** Tokens available as output (buy) */
export const BUY_TOKENS = [TOKENS.ETH, TOKENS.WETH, TOKENS.USDC]
