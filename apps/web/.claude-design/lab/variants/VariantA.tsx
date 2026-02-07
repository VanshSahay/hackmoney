"use client"

/**
 * VARIANT A: Information Hierarchy Focus
 *
 * Design rationale:
 * - Clear visual hierarchy with the swap as hero
 * - Prominent rate display
 * - Minimalist approach - only essential info visible
 * - Progressive disclosure for advanced settings
 */

import { ArrowDown, ChevronDown } from "lucide-react"
import { Button } from "#/components/ui/button"
import { mockSwapState } from "../data/fixtures"

export function VariantA() {
	const { tokenIn, tokenOut, amountIn, amountOut, rate, balanceIn, slippage } =
		mockSwapState

	return (
		<div className="flex min-h-[600px] items-center justify-center bg-gradient-to-b from-background to-muted/20 p-8">
			<div className="w-full max-w-[420px] space-y-8">
				{/* Hero rate display */}
				<div className="text-center">
					<p className="text-sm text-muted-foreground mb-1">Current Rate</p>
					<p className="text-3xl font-light tracking-tight">
						1 {tokenIn.symbol} ={" "}
						<span className="text-primary font-medium">{rate}</span>{" "}
						{tokenOut.symbol}
					</p>
				</div>

				{/* Swap card - floating glass effect */}
				<div className="rounded-2xl border bg-card/80 backdrop-blur-xl p-6 shadow-2xl shadow-primary/5">
					{/* You pay */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-muted-foreground">
								You pay
							</span>
							<button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
								Balance: {balanceIn} {tokenIn.symbol}
							</button>
						</div>
						<div className="flex items-center gap-4">
							<input
								type="text"
								value={amountIn}
								readOnly
								className="flex-1 bg-transparent text-4xl font-light tracking-tight outline-none placeholder:text-muted-foreground/30"
								placeholder="0"
							/>
							<button className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors">
								<span className="text-lg">{tokenIn.icon}</span>
								{tokenIn.symbol}
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							</button>
						</div>
					</div>

					{/* Swap direction indicator */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border/50" />
						</div>
						<div className="relative flex justify-center">
							<button className="rounded-xl border bg-background p-2.5 shadow-sm hover:bg-muted transition-all hover:scale-105 active:scale-95">
								<ArrowDown className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* You receive */}
					<div className="space-y-3">
						<span className="text-sm font-medium text-muted-foreground">
							You receive
						</span>
						<div className="flex items-center gap-4">
							<input
								type="text"
								value={amountOut}
								readOnly
								className="flex-1 bg-transparent text-4xl font-light tracking-tight text-primary outline-none"
								placeholder="0"
							/>
							<button className="flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm font-medium hover:bg-muted/80 transition-colors">
								<span className="text-lg">{tokenOut.icon}</span>
								{tokenOut.symbol}
								<ChevronDown className="h-4 w-4 text-muted-foreground" />
							</button>
						</div>
					</div>

					{/* Slippage indicator - subtle */}
					<div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
						<span>Max slippage: {slippage}%</span>
						<button className="hover:text-foreground transition-colors">
							Edit
						</button>
					</div>
				</div>

				{/* CTA - full width, prominent */}
				<Button className="w-full h-14 text-lg font-medium rounded-xl bg-primary hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]">
					Swap
				</Button>

				{/* Subtle branding */}
				<p className="text-center text-xs text-muted-foreground/50">
					Powered by Intent-based Settlement
				</p>
			</div>
		</div>
	)
}
