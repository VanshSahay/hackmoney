import { Badge } from "#/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import { truncateAddress } from "#/lib/format"

interface LpServer {
	address: string
	settlements: number
	online: boolean
}

interface LpTableProps {
	servers: LpServer[]
}

export function LpTable({ servers }: LpTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Active LP Servers</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="grid grid-cols-3 text-xs font-medium text-muted-foreground pb-1 border-b">
						<span>Address</span>
						<span className="text-center">Settlements</span>
						<span className="text-right">Status</span>
					</div>
					{servers.map((server) => (
						<div
							key={server.address}
							className="grid grid-cols-3 items-center py-1.5 text-sm"
						>
							<span className="font-mono text-xs">
								{truncateAddress(server.address)}
							</span>
							<span className="text-center">{server.settlements}</span>
							<div className="flex justify-end">
								<Badge variant={server.online ? "default" : "secondary"}>
									{server.online ? "Online" : "Offline"}
								</Badge>
							</div>
						</div>
					))}
					{servers.length === 0 && (
						<p className="text-sm text-muted-foreground py-4 text-center">
							No servers registered yet
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
