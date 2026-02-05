"use client"

import { useCallback, useRef } from "react"
import { useIntentStore } from "#/stores/intent-store"
import { MOCK_PHASE_DURATIONS } from "#/lib/constants"
import type { IntentPhase } from "#/types/intent"

const MOCK_SEQUENCE: IntentPhase[] = ["submitted", "processing", "settling", "filled"]

export function useMockSettlement() {
	const { setPhase, setSettlementTxHash } = useIntentStore()
	const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

	const startMockSettlement = useCallback(() => {
		// Clear any existing timeouts
		for (const t of timeoutsRef.current) clearTimeout(t)
		timeoutsRef.current = []

		let accumulated = 0

		for (const phase of MOCK_SEQUENCE) {
			const duration = MOCK_PHASE_DURATIONS[phase] ?? 0
			accumulated += duration

			const t = setTimeout(() => {
				setPhase(phase)
				if (phase === "filled") {
					// Generate a mock settlement tx hash
					setSettlementTxHash(
						`0x${"0".repeat(62)}42` as `0x${string}`
					)
				}
			}, accumulated)

			timeoutsRef.current.push(t)
		}
	}, [setPhase, setSettlementTxHash])

	const cancelMock = useCallback(() => {
		for (const t of timeoutsRef.current) clearTimeout(t)
		timeoutsRef.current = []
	}, [])

	return { startMockSettlement, cancelMock }
}
