import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"

interface ProtocolStats {
	totalIntents: number
	totalFilled: number
	fillRate: number
	avgSettlementTime: string
}

interface LpStatsProps {
	stats: ProtocolStats
}

export function LpStats({ stats }: LpStatsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Intents
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.totalIntents}</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Intents Filled
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.totalFilled}</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Fill Rate
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.fillRate.toFixed(1)}%</p>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Avg Settlement
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-2xl font-bold">{stats.avgSettlementTime}</p>
				</CardContent>
			</Card>
		</div>
	)
}
