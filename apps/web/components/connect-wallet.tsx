"use client"

import { formatUnits } from "viem"
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi"

export function ConnectWallet() {
	const { address, isConnected, chain } = useAccount()
	const { connectors, connect, isPending } = useConnect()
	const { disconnect } = useDisconnect()
	const { data: balance } = useBalance({ address })

	if (isConnected) {
		return (
			<div className="flex flex-col gap-2 rounded-lg border p-4">
				<p className="text-sm">
					Connected to <strong>{chain?.name}</strong>
				</p>
				<p className="font-mono text-xs break-all">{address}</p>
				{balance && (
					<p className="text-sm">
						{formatUnits(balance.value, balance.decimals)} {balance.symbol}
					</p>
				)}
				<button
					type="button"
					onClick={() => disconnect()}
					className="mt-2 cursor-pointer rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
				>
					Disconnect
				</button>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-2">
			{connectors.map((connector) => (
				<button
					type="button"
					key={connector.uid}
					onClick={() => connect({ connector })}
					disabled={isPending}
					className="cursor-pointer rounded border px-4 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-800"
				>
					{isPending ? "Connecting..." : connector.name}
				</button>
			))}
		</div>
	)
}
