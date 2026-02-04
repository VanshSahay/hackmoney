"use client"

import { type ReactNode, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type State, WagmiProvider } from "wagmi"
import { wagmiConfig } from "@/config/wagmi"

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 min — avoid re-fetching on-chain data too aggressively
				refetchOnWindowFocus: false,
			},
		},
	})
}

export function Web3Provider({
	children,
	initialState,
}: {
	children: ReactNode
	initialState?: State
}) {
	const [queryClient] = useState(makeQueryClient)

	return (
		<WagmiProvider config={wagmiConfig} initialState={initialState}>
			<QueryClientProvider client={queryClient}>
				{children}
			</QueryClientProvider>
		</WagmiProvider>
	)
}
