import { LpStats } from "#/components/lp/lp-stats"
import { LpTable } from "#/components/lp/lp-table"
import { RecentSettlements } from "#/components/lp/recent-settlements"
import { getIntentStats, getLpStats } from "#/lib/lp-data"

// Revalidate every 30 seconds
export const revalidate = 30

export default async function LpPage() {
	const [lpStats, intentStats] = await Promise.all([
		getLpStats(),
		getIntentStats(),
	])

	// Map registered nodes to server format
	const servers = lpStats.registeredNodes.map((address) => ({
		address,
		settlements: 0, // We don't track per-node settlements on-chain yet
		online: true, // Assume registered nodes are online
	}))

	const stats = {
		totalIntents: intentStats.totalIntents,
		totalFilled: intentStats.filledIntents,
		fillRate: intentStats.fillRate,
		avgSettlementTime: "N/A", // Not tracked on-chain
	}

	// Recent settlements placeholder - would need event indexing for real data
	const recentSettlements: {
		intentId: string
		tokenIn: string
		tokenOut: string
		amountIn: string
		amountOut: string
		serverCount: number
		timestamp: string
	}[] = []

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">LP Servers</h1>
				<p className="text-sm text-muted-foreground">
					On-chain data from Base Sepolia. Node count: {lpStats.totalNodes}
				</p>
			</div>

			<LpStats stats={stats} />
			<div className="grid gap-6 lg:grid-cols-2">
				<LpTable servers={servers} />
				<RecentSettlements settlements={recentSettlements} />
			</div>
		</div>
	)
}
