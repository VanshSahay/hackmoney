"use client"

/**
 * VARIANT E: Command-Palette Style
 *
 * Design rationale:
 * - Power user focused - keyboard-first feel
 * - Compact but not cramped
 * - Quick actions and shortcuts visible
 * - Professional, Linear-inspired aesthetic
 */

import { ArrowDown, Clock, Keyboard, TrendingUp } from "lucide-react"
import { Button } from "#/components/ui/button"
import { mockSwapState } from "../data/fixtures"

export function VariantE() {
	const { tokenIn, tokenOut, amountIn, amountOut, rate, balanceIn, slippage } =
		mockSwapState

	return (
		<div className="flex min-h-[600px] items-center justify-center bg-background p-6">
			<div className="w-full max-w-[440px]">
				{/* Command palette style header */}
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
							⌘K
						</div>
						<span className="text-sm text-muted-foreground">Quick swap</span>
					</div>
					<button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
						<Clock className="h-3 w-3" />
						History
					</button>
				</div>

				{/* Main interface - command palette aesthetic */}
				<div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/5">
					{/* Search-like input header */}
					<div className="border-b px-4 py-3">
						<div className="flex items-center gap-3">
							<span className="text-sm font-medium text-muted-foreground">
								Swap
							</span>
							<div className="flex-1" />
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Keyboard className="h-3 w-3" />
								<span>Tab to switch</span>
							</div>
						</div>
					</div>

					{/* From row */}
					<div className="flex items-center gap-4 border-b px-4 py-4 hover:bg-muted/30 transition-colors cursor-text">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
							{tokenIn.icon}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-baseline gap-2">
								<input
									type="text"
									value={amountIn}
									readOnly
									className="bg-transparent text-2xl font-medium outline-none w-full"
									placeholder="0"
								/>
								<span className="text-lg text-muted-foreground">
									{tokenIn.symbol}
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								Balance: {balanceIn} · $
								{(parseFloat(amountIn) * parseFloat(rate)).toLocaleString()}
							</p>
						</div>
					</div>

					{/* Direction indicator - inline */}
					<div className="flex items-center gap-3 px-4 py-2 bg-muted/30">
						<ArrowDown className="h-4 w-4 text-muted-foreground" />
						<div className="flex-1 flex items-center gap-2">
							<TrendingUp className="h-3 w-3 text-green-500" />
							<span className="text-xs text-muted-foreground">
								1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
							</span>
						</div>
						<span className="text-xs text-muted-foreground">
							Slippage: {slippage}%
						</span>
					</div>

					{/* To row */}
					<div className="flex items-center gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary">
							{tokenOut.icon}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-medium text-primary">
									{amountOut}
								</span>
								<span className="text-lg text-muted-foreground">
									{tokenOut.symbol}
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								You receive (after fees)
							</p>
						</div>
					</div>

					{/* Action bar */}
					<div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
						<div className="flex items-center gap-2">
							<kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
								Enter
							</kbd>
							<span className="text-xs text-muted-foreground">to confirm</span>
						</div>
						<Button size="sm" className="h-8 px-4 text-sm">
							Swap Now
						</Button>
					</div>
				</div>

				{/* Quick tokens */}
				<div className="mt-4 flex items-center gap-2">
					<span className="text-xs text-muted-foreground">Quick:</span>
					{["ETH", "USDC", "WBTC", "DAI"].map((token) => (
						<button
							key={token}
							className="rounded-md border bg-card px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
						>
							{token}
						</button>
					))}
				</div>

				{/* Keyboard hints */}
				<div className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground/50">
					<span>
						<kbd className="font-mono">↑↓</kbd> tokens
					</span>
					<span>
						<kbd className="font-mono">Tab</kbd> fields
					</span>
					<span>
						<kbd className="font-mono">Esc</kbd> cancel
					</span>
				</div>
			</div>
		</div>
	)
}
