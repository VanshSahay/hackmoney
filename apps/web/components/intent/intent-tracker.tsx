"use client"

import { useIntentStore } from "#/stores/intent-store"
import { IntentPhaseBadge } from "#/components/intent/intent-phase-badge"
import { Button } from "#/components/ui/button"
import { PHASE_DESCRIPTIONS } from "#/lib/constants"
import { truncateAddress } from "#/lib/format"
import type { IntentPhase } from "#/types/intent"
import { Check, Loader2, X } from "lucide-react"

const ORDERED_PHASES: IntentPhase[] = [
	"approving",
	"submitting",
	"submitted",
	"processing",
	"settling",
	"filled",
]

function phaseIndex(phase: IntentPhase): number {
	return ORDERED_PHASES.indexOf(phase)
}

export function IntentTracker() {
	const { phase, txHash, intentId, settlementTxHash, error, reset } =
		useIntentStore()

	const currentIdx = phaseIndex(phase)

	return (
		<div className="space-y-3 py-2">
			<div className="flex items-center justify-between">
				<IntentPhaseBadge phase={phase} />
				{(phase === "filled" || phase === "failed") && (
					<Button variant="ghost" size="sm" onClick={reset}>
						New Swap
					</Button>
				)}
			</div>

			<p className="text-sm text-muted-foreground">
				{PHASE_DESCRIPTIONS[phase]}
			</p>

			{/* Phase progress steps */}
			<div className="space-y-1.5">
				{ORDERED_PHASES.map((p, i) => {
					const isComplete = currentIdx > i
					const isCurrent = phase === p
					const isFailed = phase === "failed" && isCurrent

					return (
						<div key={p} className="flex items-center gap-2 text-sm">
							{isComplete ? (
								<Check className="h-3.5 w-3.5 text-green-500" />
							) : isFailed ? (
								<X className="h-3.5 w-3.5 text-destructive" />
							) : isCurrent ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
							) : (
								<div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
							)}
							<span
								className={
									isComplete
										? "text-muted-foreground"
										: isCurrent
											? "font-medium"
											: "text-muted-foreground/50"
								}
							>
								{p.charAt(0).toUpperCase() + p.slice(1)}
							</span>
						</div>
					)
				})}
			</div>

			{/* Tx info */}
			{txHash && (
				<p className="text-xs text-muted-foreground">
					Tx: {truncateAddress(txHash, 6)}
				</p>
			)}
			{intentId && (
				<p className="text-xs text-muted-foreground">
					Intent: {truncateAddress(intentId, 6)}
				</p>
			)}
			{settlementTxHash && (
				<p className="text-xs text-muted-foreground">
					Settlement: {truncateAddress(settlementTxHash, 6)}
				</p>
			)}

			{error && (
				<p className="text-sm text-destructive">{error}</p>
			)}
		</div>
	)
}
