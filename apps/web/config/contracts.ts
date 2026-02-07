import type { Address } from "viem"
import { baseSepolia } from "wagmi/chains"
import type { SupportedChainId } from "#/config/wagmi"

/** MockIntentRegistry — deploy to Base Sepolia, then update address here */
export const INTENT_REGISTRY: Partial<Record<SupportedChainId, Address>> = {
	[baseSepolia.id]: "0x0000000000000000000000000000000000000000",
}

/** Settlement contract — placeholder until deployed */
export const SETTLEMENT: Partial<Record<SupportedChainId, Address>> = {
	[baseSepolia.id]: "0x0000000000000000000000000000000000000000",
}
