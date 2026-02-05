import { LpStats } from "#/components/lp/lp-stats"
import { LpTable } from "#/components/lp/lp-table"
import { RecentSettlements } from "#/components/lp/recent-settlements"

// Mock data for demo — replace with on-chain reads when contracts deploy
const MOCK_STATS = {
	totalIntents: 142,
	totalFilled: 128,
	fillRate: 90.1,
	avgSettlementTime: "7.2s",
}

const MOCK_SERVERS = [
	{ address: "0x1234567890abcdef1234567890abcdef12345678", settlements: 48, online: true },
	{ address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", settlements: 41, online: true },
	{ address: "0x9876543210fedcba9876543210fedcba98765432", settlements: 39, online: true },
	{ address: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", settlements: 12, online: false },
]

const MOCK_SETTLEMENTS = [
	{
		intentId: "0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1",
		tokenIn: "USDC",
		tokenOut: "ETH",
		amountIn: "2,500",
		amountOut: "1.0",
		serverCount: 3,
		timestamp: "2 min ago",
	},
	{
		intentId: "0xdef456def456def456def456def456def456def456def456def456def456def4",
		tokenIn: "USDC",
		tokenOut: "ETH",
		amountIn: "5,000",
		amountOut: "2.0",
		serverCount: 3,
		timestamp: "8 min ago",
	},
	{
		intentId: "0x789789789789789789789789789789789789789789789789789789789789789a",
		tokenIn: "WETH",
		tokenOut: "USDC",
		amountIn: "0.5",
		amountOut: "1,250",
		serverCount: 2,
		timestamp: "15 min ago",
	},
]

export default function LpPage() {
	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">LP Servers</h1>
				<p className="text-sm text-muted-foreground">
					Publicly observable on-chain data. Individual capacities and allocations remain private.
				</p>
			</div>

			<LpStats stats={MOCK_STATS} />
			<div className="grid gap-6 lg:grid-cols-2">
				<LpTable servers={MOCK_SERVERS} />
				<RecentSettlements settlements={MOCK_SETTLEMENTS} />
			</div>
		</div>
	)
}
