"use client"

/**
 * VARIANT B: Split-Pane Layout
 *
 * Design rationale:
 * - Desktop: Side-by-side token selection (more visual impact)
 * - Mobile: Stacks vertically
 * - Large touch targets
 * - Visual token representation with color coding
 */

import { ArrowDown, ArrowRight, Zap } from "lucide-react"
import { Button } from "#/components/ui/button"
import { mockSwapState } from "../data/fixtures"

export function VariantB() {
	const {
		tokenIn,
		tokenOut,
		amountIn,
		amountOut,
		rate,
		balanceIn,
		balanceOut,
	} = mockSwapState

	return (
		<div className="flex min-h-[600px] items-center justify-center bg-background p-4 md:p-8">
			<div className="w-full max-w-3xl">
				{/* Main swap interface - split design */}
				<div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-stretch">
					{/* FROM panel */}
					<div
						className="rounded-2xl p-6 md:rounded-r-none md:border-r-0"
						style={{
							background: `linear-gradient(135deg, ${tokenIn.color}10 0%, transparent 50%)`,
							border: `1px solid ${tokenIn.color}30`,
						}}
					>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-xs uppercase tracking-wider text-muted-foreground">
									From
								</span>
								<span className="text-xs text-muted-foreground">
									Bal: {balanceIn}
								</span>
							</div>

							{/* Token display - large and prominent */}
							<div className="flex items-center gap-3">
								<div
									className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
									style={{
										background: `${tokenIn.color}20`,
										color: tokenIn.color,
									}}
								>
									{tokenIn.icon}
								</div>
								<div>
									<p className="text-xl font-semibold">{tokenIn.symbol}</p>
									<p className="text-sm text-muted-foreground">
										{tokenIn.name}
									</p>
								</div>
							</div>

							{/* Amount input */}
							<div className="mt-4">
								<input
									type="text"
									value={amountIn}
									readOnly
									className="w-full bg-transparent text-4xl font-light outline-none"
									placeholder="0.00"
								/>
								<p className="mt-1 text-sm text-muted-foreground">
									≈ $
									{(parseFloat(amountIn) * parseFloat(rate)).toLocaleString()}
								</p>
							</div>
						</div>
					</div>

					{/* Center connector */}
					<div className="flex items-center justify-center md:px-4">
						<button className="rounded-full border bg-background p-3 shadow-lg hover:bg-muted transition-all hover:scale-110 active:scale-95">
							<ArrowRight className="hidden md:block h-5 w-5" />
							<ArrowDown className="md:hidden h-5 w-5" />
						</button>
					</div>

					{/* TO panel */}
					<div
						className="rounded-2xl p-6 md:rounded-l-none md:border-l-0"
						style={{
							background: `linear-gradient(135deg, transparent 50%, ${tokenOut.color}10 100%)`,
							border: `1px solid ${tokenOut.color}30`,
						}}
					>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-xs uppercase tracking-wider text-muted-foreground">
									To
								</span>
								<span className="text-xs text-muted-foreground">
									Bal: {balanceOut}
								</span>
							</div>

							<div className="flex items-center gap-3">
								<div
									className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
									style={{
										background: `${tokenOut.color}20`,
										color: tokenOut.color,
									}}
								>
									{tokenOut.icon}
								</div>
								<div>
									<p className="text-xl font-semibold">{tokenOut.symbol}</p>
									<p className="text-sm text-muted-foreground">
										{tokenOut.name}
									</p>
								</div>
							</div>

							<div className="mt-4">
								<input
									type="text"
									value={amountOut}
									readOnly
									className="w-full bg-transparent text-4xl font-light text-primary outline-none"
									placeholder="0.00"
								/>
								<p className="mt-1 text-sm text-muted-foreground">
									Best rate guaranteed
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Rate and action bar */}
				<div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border bg-card/50 p-4">
					<div className="flex items-center gap-2 text-sm">
						<Zap className="h-4 w-4 text-yellow-500" />
						<span className="text-muted-foreground">
							1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
						</span>
					</div>

					<Button className="w-full md:w-auto h-12 px-12 text-base font-medium rounded-xl">
						Execute Swap
					</Button>
				</div>
			</div>
		</div>
	)
}
