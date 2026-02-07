"use client"

import { TokenSelector } from "#/components/swap/token-selector"
import { Input } from "#/components/ui/input"
import { formatTokenAmount } from "#/lib/format"
import type { Token } from "#/types/token"

interface TokenInputProps {
	label: string
	tokens: Token[]
	selectedToken: Token | null
	onSelectToken: (token: Token) => void
	amount: string
	onAmountChange?: (value: string) => void
	balance?: bigint
	readOnly?: boolean
	disabled?: boolean
}

export function TokenInput({
	label,
	tokens,
	selectedToken,
	onSelectToken,
	amount,
	onAmountChange,
	balance,
	readOnly = false,
	disabled = false,
}: TokenInputProps) {
	return (
		<div className="rounded-lg bg-muted/50 p-3">
			<div className="mb-1 flex items-center justify-between">
				<span className="text-xs text-muted-foreground">{label}</span>
				{selectedToken && balance !== undefined && (
					<button
						type="button"
						className="text-xs text-muted-foreground hover:text-foreground"
						onClick={() => {
							if (onAmountChange && !readOnly) {
								onAmountChange(
									formatTokenAmount(
										balance,
										selectedToken.decimals,
										selectedToken.decimals,
									),
								)
							}
						}}
					>
						Balance: {formatTokenAmount(balance, selectedToken.decimals)}
						{!readOnly && " (Max)"}
					</button>
				)}
			</div>
			<div className="flex items-center gap-2">
				<Input
					type="text"
					inputMode="decimal"
					placeholder="0.0"
					value={amount}
					onChange={(e) => {
						const val = e.target.value
						if (/^[0-9]*\.?[0-9]*$/.test(val)) {
							onAmountChange?.(val)
						}
					}}
					readOnly={readOnly}
					disabled={disabled}
					className="border-0 bg-transparent p-0 text-2xl font-medium shadow-none focus-visible:ring-0"
				/>
				<TokenSelector
					tokens={tokens}
					selected={selectedToken}
					onSelect={onSelectToken}
					disabled={disabled}
				/>
			</div>
		</div>
	)
}
