"use client"

/**
 * VARIANT C: Ultra-Spacious & Premium
 *
 * Design rationale:
 * - Maximum whitespace for premium feel
 * - Typography-driven hierarchy
 * - Subtle animations and hover states
 * - Minimal chrome, content-focused
 */

import { ArrowDownUp } from "lucide-react"
import { Button } from "#/components/ui/button"
import { mockSwapState } from "../data/fixtures"

export function VariantC() {
	const { tokenIn, tokenOut, amountIn, amountOut, rate, balanceIn } =
		mockSwapState

	return (
		<div className="flex min-h-[600px] items-center justify-center bg-background p-8">
			<div className="w-full max-w-lg space-y-16">
				{/* Minimal header */}
				<div className="text-center">
					<h1 className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground">
						Swap
					</h1>
				</div>

				{/* Main swap area - ultra clean */}
				<div className="space-y-12">
					{/* From section */}
					<div className="group space-y-4">
						<div className="flex items-baseline justify-between">
							<span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
								Sell
							</span>
							<span className="text-xs text-muted-foreground/60">
								{balanceIn} available
							</span>
						</div>

						<div className="flex items-end gap-6">
							<input
								type="text"
								value={amountIn}
								readOnly
								className="flex-1 bg-transparent text-6xl font-extralight tracking-tight outline-none"
								placeholder="0"
							/>
							<button className="pb-2 text-2xl font-light text-muted-foreground hover:text-foreground transition-colors">
								{tokenIn.symbol}
							</button>
						</div>

						<div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
					</div>

					{/* Swap toggle - centered and elegant */}
					<div className="flex justify-center">
						<button className="group/btn rounded-full p-4 hover:bg-muted transition-all duration-300 hover:scale-110 active:scale-95">
							<ArrowDownUp className="h-6 w-6 text-muted-foreground group-hover/btn:text-foreground transition-colors" />
						</button>
					</div>

					{/* To section */}
					<div className="group space-y-4">
						<span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
							Receive
						</span>

						<div className="flex items-end gap-6">
							<span className="flex-1 text-6xl font-extralight tracking-tight text-primary">
								{amountOut}
							</span>
							<button className="pb-2 text-2xl font-light text-muted-foreground hover:text-foreground transition-colors">
								{tokenOut.symbol}
							</button>
						</div>

						<div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
					</div>
				</div>

				{/* Rate - understated */}
				<div className="text-center">
					<p className="text-sm text-muted-foreground/60">
						1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
					</p>
				</div>

				{/* CTA - refined */}
				<div className="pt-4">
					<Button
						className="w-full h-16 text-base font-normal tracking-wide rounded-2xl
                       bg-foreground text-background hover:bg-foreground/90
                       transition-all duration-300 hover:shadow-2xl hover:shadow-foreground/10
                       active:scale-[0.98]"
					>
						Confirm Swap
					</Button>
				</div>
			</div>
		</div>
	)
}
