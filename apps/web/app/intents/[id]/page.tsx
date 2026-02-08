"use client"

import { useParams } from "next/navigation"
import type { Hex } from "viem"
import { formatUnits } from "viem"
import { IntentPhaseBadge } from "#/components/intent/intent-phase-badge"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { Skeleton } from "#/components/ui/skeleton"
import { useIntentStatus } from "#/hooks/use-intent-status"
import { IntentStatus } from "#/lib/abis/intent-registry"
import { truncateAddress } from "#/lib/format"

export default function IntentPage() {
	const params = useParams<{ id: string }>()
	const intentId = params.id as Hex

	const { intentData, status } = useIntentStatus(intentId)

	const getPhaseFromStatus = () => {
		if (!intentData) return "processing"
		if (intentData.status === IntentStatus.Filled) return "filled"
		if (intentData.status === IntentStatus.Cancelled) return "failed"
		return "processing"
	}

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center pt-16 px-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-lg">Intent Details</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2 text-sm">
						<div className="flex justify-between">
							<span className="text-muted-foreground">Intent ID</span>
							<span className="font-mono text-xs">
								{truncateAddress(intentId, 8)}
							</span>
						</div>

						{intentData ? (
							<>
								<div className="flex justify-between">
									<span className="text-muted-foreground">User</span>
									<span className="font-mono text-xs">
										{truncateAddress(intentData.user)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Token In</span>
									<span className="font-mono text-xs">
										{truncateAddress(intentData.tokenIn)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Token Out</span>
									<span className="font-mono text-xs">
										{truncateAddress(intentData.tokenOut)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Amount In</span>
									<span>{formatUnits(intentData.amountIn, 18)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Min Amount Out</span>
									<span>{formatUnits(intentData.minAmountOut, 18)}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Deadline</span>
									<span>
										{new Date(
											Number(intentData.deadline) * 1000,
										).toLocaleString()}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-muted-foreground">Status</span>
									<IntentPhaseBadge phase={getPhaseFromStatus()} />
								</div>
							</>
						) : (
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
