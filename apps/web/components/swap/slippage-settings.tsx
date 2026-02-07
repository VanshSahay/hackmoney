"use client"

import { useState } from "react"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Label } from "#/components/ui/label"
import { SLIPPAGE_OPTIONS } from "#/lib/constants"
import { cn } from "#/lib/utils"

interface SlippageSettingsProps {
	slippageBps: number
	onSlippageChange: (bps: number) => void
}

export function SlippageSettings({
	slippageBps,
	onSlippageChange,
}: SlippageSettingsProps) {
	const [customValue, setCustomValue] = useState("")
	const isCustom = !SLIPPAGE_OPTIONS.includes(slippageBps as 10 | 50 | 100)

	const handleCustomChange = (value: string) => {
		setCustomValue(value)
		const parsed = Number.parseFloat(value)
		if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 50) {
			// Convert percentage to bps (0.5% -> 50 bps)
			onSlippageChange(Math.round(parsed * 100))
		}
	}

	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">Slippage Tolerance</Label>
			<div className="flex gap-2">
				{SLIPPAGE_OPTIONS.map((bps) => (
					<Button
						key={bps}
						variant={slippageBps === bps ? "default" : "outline"}
						size="sm"
						className="flex-1"
						onClick={() => {
							onSlippageChange(bps)
							setCustomValue("")
						}}
					>
						{(bps / 100).toFixed(1)}%
					</Button>
				))}
			</div>
			<div className="flex items-center gap-2">
				<Input
					type="number"
					step="0.1"
					min="0.01"
					max="50"
					placeholder="Custom"
					value={isCustom ? (slippageBps / 100).toString() : customValue}
					onChange={(e) => handleCustomChange(e.target.value)}
					className={cn("w-24", isCustom && "border-primary")}
				/>
				<span className="text-sm text-muted-foreground">%</span>
			</div>
			{slippageBps > 100 && (
				<p className="text-xs text-amber-500">
					High slippage may result in unfavorable trades
				</p>
			)}
		</div>
	)
}
