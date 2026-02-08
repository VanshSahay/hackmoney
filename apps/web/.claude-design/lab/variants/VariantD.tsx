"use client"

/**
 * VARIANT D: Cyberpunk/Neon Accent
 *
 * Design rationale:
 * - Dark aesthetic with neon accents
 * - Glowing effects on interactive elements
 * - Bold visual identity
 * - Gaming-inspired UI patterns
 */

import { ArrowDown, Gauge, Sparkles } from "lucide-react"
import { Button } from "#/components/ui/button"
import { mockIntentPhases, mockSwapState } from "../data/fixtures"

export function VariantD() {
	const {
		tokenIn,
		tokenOut,
		amountIn,
		amountOut,
		rate,
		balanceIn,
		priceImpact,
		networkFee,
	} = mockSwapState

	return (
		<div className="flex min-h-[600px] items-center justify-center bg-[#0a0a0f] p-6">
			{/* Ambient glow effects */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[100px]" />
				<div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
			</div>

			<div className="relative w-full max-w-md">
				{/* Header with status */}
				<div className="mb-6 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
						<span className="text-sm text-zinc-400">Network Active</span>
					</div>
					<button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
						<Gauge className="h-4 w-4" />
						0.5%
					</button>
				</div>

				{/* Main card - glass morphism with glow */}
				<div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
					{/* Glow border effect */}
					<div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-purple-500/20 via-transparent to-cyan-500/20 -z-10" />

					{/* You pay */}
					<div className="space-y-3 rounded-2xl bg-black/40 p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="text-zinc-500">You pay</span>
							<button className="text-zinc-400 hover:text-white transition-colors">
								Max: {balanceIn}
							</button>
						</div>
						<div className="flex items-center gap-3">
							<input
								type="text"
								value={amountIn}
								readOnly
								className="flex-1 bg-transparent text-4xl font-medium text-white outline-none"
								placeholder="0"
							/>
							<button className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-medium text-white hover:bg-white/20 transition-all group">
								<span
									className="text-xl"
									style={{ filter: "drop-shadow(0 0 8px #627EEA)" }}
								>
									{tokenIn.icon}
								</span>
								{tokenIn.symbol}
							</button>
						</div>
					</div>

					{/* Swap button */}
					<div className="relative -my-2 flex justify-center z-10">
						<button className="rounded-xl border border-white/20 bg-[#0a0a0f] p-3 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group">
							<ArrowDown className="h-4 w-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
						</button>
					</div>

					{/* You receive */}
					<div className="space-y-3 rounded-2xl bg-black/40 p-4">
						<span className="text-sm text-zinc-500">You receive</span>
						<div className="flex items-center gap-3">
							<span className="flex-1 text-4xl font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
								{amountOut}
							</span>
							<button className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-medium text-white hover:bg-white/20 transition-all">
								<span
									className="text-xl"
									style={{ filter: "drop-shadow(0 0 8px #2775CA)" }}
								>
									{tokenOut.icon}
								</span>
								{tokenOut.symbol}
							</button>
						</div>
					</div>

					{/* Rate info with glow */}
					<div className="mt-4 flex items-center justify-between rounded-xl bg-purple-500/10 px-4 py-3 border border-purple-500/20">
						<div className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-purple-400" />
							<span className="text-sm text-zinc-300">Best Route</span>
						</div>
						<span className="text-sm text-white">
							1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
						</span>
					</div>

					{/* Details row */}
					<div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
						<span>
							Price Impact:{" "}
							<span className="text-green-400">{priceImpact}%</span>
						</span>
						<span>Fee: {networkFee}</span>
					</div>
				</div>

				{/* CTA - neon glow effect */}
				<Button
					className="mt-6 w-full h-14 text-base font-semibold rounded-2xl
                     bg-gradient-to-r from-purple-600 to-cyan-600
                     hover:from-purple-500 hover:to-cyan-500
                     shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50
                     transition-all duration-300 active:scale-[0.98]"
				>
					Execute Swap
				</Button>

				{/* Intent status preview */}
				<div className="mt-6 flex items-center justify-center gap-1">
					{mockIntentPhases.slice(0, 4).map((phase, i) => (
						<div
							key={phase.id}
							className={`h-1 w-8 rounded-full transition-all ${
								phase.status === "complete"
									? "bg-green-500"
									: phase.status === "current"
										? "bg-purple-500 animate-pulse"
										: "bg-zinc-800"
							}`}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
