import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { truncateAddress } from "#/lib/format"

interface Settlement {
	intentId: string
	tokenIn: string
	tokenOut: string
	amountIn: string
	amountOut: string
	serverCount: number
	timestamp: string
}

interface RecentSettlementsProps {
	settlements: Settlement[]
}

export function RecentSettlements({ settlements }: RecentSettlementsProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Recent Settlements</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="grid grid-cols-5 text-xs font-medium text-muted-foreground pb-1 border-b">
						<span>Intent</span>
						<span>Pair</span>
						<span className="text-right">In</span>
						<span className="text-right">Out</span>
						<span className="text-right">Servers</span>
					</div>
					{settlements.map((s) => (
						<div
							key={s.intentId}
							className="grid grid-cols-5 items-center py-1.5 text-sm"
						>
							<span className="font-mono text-xs">
								{truncateAddress(s.intentId, 2)}
							</span>
							<span className="text-xs">
								{s.tokenIn}/{s.tokenOut}
							</span>
							<span className="text-right text-xs">{s.amountIn}</span>
							<span className="text-right text-xs">{s.amountOut}</span>
							<span className="text-right text-xs">{s.serverCount}</span>
						</div>
					))}
					{settlements.length === 0 && (
						<p className="text-sm text-muted-foreground py-4 text-center">
							No settlements yet
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
