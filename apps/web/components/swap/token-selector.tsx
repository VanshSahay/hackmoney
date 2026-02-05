"use client"

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select"
import type { Token } from "#/types/token"

interface TokenSelectorProps {
	tokens: Token[]
	selected: Token | null
	onSelect: (token: Token) => void
	disabled?: boolean
}

export function TokenSelector({ tokens, selected, onSelect, disabled }: TokenSelectorProps) {
	return (
		<Select
			value={selected?.symbol ?? ""}
			onValueChange={(symbol) => {
				const token = tokens.find((t) => t.symbol === symbol)
				if (token) onSelect(token)
			}}
			disabled={disabled}
		>
			<SelectTrigger className="w-[120px] font-medium">
				<SelectValue placeholder="Token" />
			</SelectTrigger>
			<SelectContent>
				{tokens.map((token) => (
					<SelectItem key={token.symbol} value={token.symbol}>
						{token.symbol}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
