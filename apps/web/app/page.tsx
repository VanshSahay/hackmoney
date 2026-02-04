import { Suspense } from "react"
import { ConnectWallet } from "@/components/connect-wallet"
import { BlockNumber } from "@/components/block-number"

export default function Home() {
	return (
		<div className="flex min-h-screen items-center justify-center font-sans dark:bg-black">
			<main className="flex w-full max-w-md flex-col gap-8 p-8">
				<h1 className="text-2xl font-semibold tracking-tight">
					HackMoney
				</h1>

				<section className="flex flex-col gap-3">
					<h2 className="text-sm font-medium text-neutral-500">
						Wallet
					</h2>
					<ConnectWallet />
				</section>

				<section className="flex flex-col gap-3">
					<h2 className="text-sm font-medium text-neutral-500">
						On-chain (server)
					</h2>
					<Suspense
						fallback={
							<p className="text-sm text-neutral-400">
								Loading block number...
							</p>
						}
					>
						<BlockNumber />
					</Suspense>
				</section>
			</main>
		</div>
	)
}
