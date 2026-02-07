"use client"

import { Check, ExternalLink, Loader2, X } from "lucide-react"
import { IntentPhaseBadge } from "#/components/intent/intent-phase-badge"
import { Button } from "#/components/ui/button"
import { useSettlementWatcher } from "#/hooks/use-settlement-watcher"
import { BLOCK_EXPLORER_URL, PHASE_DESCRIPTIONS } from "#/lib/constants"
import { truncateAddress } from "#/lib/format"
import { useIntentStore } from "#/stores/intent-store"
import type { IntentPhase } from "#/types/intent"

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

function ExplorerLink({ hash, label }: { hash: `0x${string}`; label: string }) {
	return (
		<a
			href={`${BLOCK_EXPLORER_URL}/tx/${hash}`}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
		>
			{label}: {truncateAddress(hash, 6)}
			<ExternalLink className="h-3 w-3" />
		</a>
	)
}

export function IntentTracker() {
	const { phase, txHash, intentId, settlementTxHash, error, reset } =
		useIntentStore()

	// Watch for settlement events
	useSettlementWatcher()

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

			{/* Tx info with explorer links */}
			<div className="space-y-1">
				{txHash && <ExplorerLink hash={txHash} label="Tx" />}
				{intentId && (
					<p className="text-xs text-muted-foreground">
						Intent: {truncateAddress(intentId, 6)}
					</p>
				)}
				{settlementTxHash && (
					<ExplorerLink hash={settlementTxHash} label="Settlement" />
				)}
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	)
}
