"use client"

import { ArrowDown, Settings2 } from "lucide-react"
import { useCallback, useState } from "react"
import { parseUnits } from "viem"
import { useAccount, useChainId } from "wagmi"
import { IntentTracker } from "#/components/intent/intent-tracker"
import { SlippageSettings } from "#/components/swap/slippage-settings"
import { SwapButton } from "#/components/swap/swap-button"
import { TokenInput } from "#/components/swap/token-input"
import { Button } from "#/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover"
import { Separator } from "#/components/ui/separator"
import { INTENT_REGISTRY } from "#/config/contracts"
import { BUY_TOKENS, SELL_TOKENS } from "#/config/tokens"
import type { SupportedChainId } from "#/config/wagmi"
import { useIntentLifecycle } from "#/hooks/use-intent-lifecycle"
import { useTokenAllowance } from "#/hooks/use-token-allowance"
import { useTokenBalance } from "#/hooks/use-token-balance"
import { DEFAULT_SLIPPAGE_BPS } from "#/lib/constants"
import { useIntentStore } from "#/stores/intent-store"
import type { Token } from "#/types/token"

export function SwapCard() {
	const chainId = useChainId() as SupportedChainId
	const { address } = useAccount()
	const phase = useIntentStore((s) => s.phase)

	const [tokenIn, setTokenIn] = useState<Token | null>(SELL_TOKENS[0])
	const [tokenOut, setTokenOut] = useState<Token | null>(BUY_TOKENS[0])
	const [amountIn, setAmountIn] = useState("")
	const [amountOut, setAmountOut] = useState("")
	const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS)

	const tokenInAddress = tokenIn?.addresses[chainId]
	const spender = INTENT_REGISTRY[chainId]

	const { balance: balanceIn } = useTokenBalance(tokenInAddress, address)
	const { balance: balanceOut } = useTokenBalance(
		tokenOut?.addresses[chainId],
		address,
	)
	const { allowance } = useTokenAllowance(tokenInAddress, address, spender)

	const parsedAmount =
		amountIn && tokenIn ? parseUnits(amountIn, tokenIn.decimals) : 0n

	const needsApproval =
		allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount

	const { execute } = useIntentLifecycle()

	const handleSwap = useCallback(() => {
		if (!tokenIn || !tokenOut || !parsedAmount || !amountOut) return
		const tokenInAddr = tokenIn.addresses[chainId]
		const tokenOutAddr = tokenOut.addresses[chainId]
		if (!tokenInAddr || !tokenOutAddr) return

		const expectedAmountOut = parseUnits(amountOut, tokenOut.decimals)
		execute({
			tokenIn: tokenInAddr,
			tokenOut: tokenOutAddr,
			amountIn: parsedAmount,
			expectedAmountOut,
			needsApproval,
			slippageBps,
		})
	}, [
		tokenIn,
		tokenOut,
		parsedAmount,
		amountOut,
		chainId,
		needsApproval,
		slippageBps,
		execute,
	])

	// Compute mock output (1 ETH ≈ 2500 USDC for demo)
	const computeOutput = useCallback(
		(input: string) => {
			if (!input || !tokenIn || !tokenOut) {
				setAmountOut("")
				return
			}
			const val = Number.parseFloat(input)
			if (Number.isNaN(val) || val === 0) {
				setAmountOut("")
				return
			}
			if (tokenIn.symbol === "USDC" && tokenOut.symbol === "ETH") {
				setAmountOut((val / 2500).toFixed(6))
			} else if (tokenIn.symbol === "ETH" && tokenOut.symbol === "USDC") {
				setAmountOut((val * 2500).toFixed(2))
			} else {
				setAmountOut(val.toFixed(4))
			}
		},
		[tokenIn, tokenOut],
	)

	const isActive = phase !== "idle" && phase !== "filled" && phase !== "failed"

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg">Swap</CardTitle>
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<Settings2 className="h-4 w-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-72" align="end">
							<SlippageSettings
								slippageBps={slippageBps}
								onSlippageChange={setSlippageBps}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</CardHeader>
			<CardContent className="space-y-2">
				{/* Sell */}
				<TokenInput
					label="You pay"
					tokens={SELL_TOKENS}
					selectedToken={tokenIn}
					onSelectToken={setTokenIn}
					amount={amountIn}
					onAmountChange={(v) => {
						setAmountIn(v)
						computeOutput(v)
					}}
					balance={balanceIn}
					disabled={isActive}
				/>

				{/* Arrow */}
				<div className="flex justify-center -my-1">
					<div className="rounded-full border bg-background p-1.5">
						<ArrowDown className="h-4 w-4 text-muted-foreground" />
					</div>
				</div>

				{/* Buy */}
				<TokenInput
					label="You receive"
					tokens={BUY_TOKENS}
					selectedToken={tokenOut}
					onSelectToken={setTokenOut}
					amount={amountOut}
					readOnly
					balance={balanceOut}
					disabled={isActive}
				/>

				{/* Rate preview */}
				{tokenIn && tokenOut && amountIn && amountOut && (
					<p className="text-center text-xs text-muted-foreground">
						1 {tokenIn.symbol} ≈{" "}
						{(
							Number.parseFloat(amountOut) / Number.parseFloat(amountIn)
						).toFixed(6)}{" "}
						{tokenOut.symbol}
					</p>
				)}

				<Separator />

				<SwapButton
					phase={phase}
					hasAmount={parsedAmount > 0n}
					hasTokens={!!tokenIn && !!tokenOut}
					needsApproval={needsApproval}
					onSwap={handleSwap}
				/>

				{/* Intent tracker shows when swap is in progress */}
				{phase !== "idle" && (
					<>
						<Separator />
						<IntentTracker />
					</>
				)}
			</CardContent>
		</Card>
	)
}
