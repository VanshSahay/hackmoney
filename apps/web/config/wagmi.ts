import { cookieStorage, createConfig, createStorage, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { injected } from "wagmi/connectors"

export const supportedChains = [base, baseSepolia] as const

export type SupportedChainId = (typeof supportedChains)[number]["id"]

export const wagmiConfig = createConfig({
	chains: supportedChains,
	ssr: true,
	storage: createStorage({ storage: cookieStorage }),
	connectors: [injected()],
	transports: {
		[base.id]: http(process.env.NEXT_PUBLIC_RPC_BASE || undefined),
		[baseSepolia.id]: http(
			process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA || undefined,
		),
	},
})
