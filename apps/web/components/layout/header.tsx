"use client"

import Link from "next/link"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "#/components/ui/button"
import { truncateAddress } from "#/lib/format"

export function Header() {
	const { address, isConnected, chain } = useAccount()
	const { connectors, connect, isPending } = useConnect()
	const { disconnect } = useDisconnect()

	return (
		<header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
				<div className="flex items-center gap-6">
					<Link href="/" className="font-semibold tracking-tight">
						HackMoney
					</Link>
					<nav className="flex items-center gap-4 text-sm">
						<Link
							href="/"
							className="text-muted-foreground transition-colors hover:text-foreground"
						>
							Swap
						</Link>
						<Link
							href="/lp"
							className="text-muted-foreground transition-colors hover:text-foreground"
						>
							LPs
						</Link>
					</nav>
				</div>

				<div className="flex items-center gap-2">
					{isConnected ? (
						<>
							{chain && (
								<span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
									{chain.name}
								</span>
							)}
							<Button variant="outline" size="sm" onClick={() => disconnect()}>
								{truncateAddress(address!)}
							</Button>
						</>
					) : (
						connectors.slice(0, 1).map((connector) => (
							<Button
								key={connector.uid}
								size="sm"
								onClick={() => connect({ connector })}
								disabled={isPending}
							>
								{isPending ? "Connecting..." : "Connect Wallet"}
							</Button>
						))
					)}
				</div>
			</div>
		</header>
	)
}
