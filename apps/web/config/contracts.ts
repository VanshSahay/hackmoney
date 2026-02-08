import type { Address } from "viem"
import { baseSepolia } from "wagmi/chains"
import type { SupportedChainId } from "#/config/wagmi"

/** Settlement contract address on Base Sepolia - handles both intent creation and settlement */
export const SETTLEMENT_ADDRESS =
	"0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4" as const

/** IntentRegistry is the same as Settlement contract */
export const INTENT_REGISTRY: Partial<Record<SupportedChainId, Address>> = {
	[baseSepolia.id]: SETTLEMENT_ADDRESS,
}

/** Settlement contract - same as INTENT_REGISTRY (single contract handles both) */
export const SETTLEMENT: Partial<Record<SupportedChainId, Address>> = {
	[baseSepolia.id]: SETTLEMENT_ADDRESS,
}
