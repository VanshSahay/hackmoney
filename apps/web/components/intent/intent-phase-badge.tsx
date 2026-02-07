"use client"

import { Badge } from "#/components/ui/badge"
import { PHASE_LABELS } from "#/lib/constants"
import type { IntentPhase } from "#/types/intent"

const PHASE_VARIANT: Record<
	IntentPhase,
	"default" | "secondary" | "destructive" | "outline"
> = {
	idle: "outline",
	approving: "secondary",
	submitting: "secondary",
	submitted: "secondary",
	processing: "secondary",
	settling: "secondary",
	filled: "default",
	failed: "destructive",
}

interface IntentPhaseBadgeProps {
	phase: IntentPhase
}

export function IntentPhaseBadge({ phase }: IntentPhaseBadgeProps) {
	return <Badge variant={PHASE_VARIANT[phase]}>{PHASE_LABELS[phase]}</Badge>
}
