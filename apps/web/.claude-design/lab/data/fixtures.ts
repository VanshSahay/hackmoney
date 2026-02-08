// Mock data for design variants
export const mockTokens = {
	eth: {
		symbol: "ETH",
		name: "Ethereum",
		decimals: 18,
		icon: "⟠",
		color: "#627EEA",
	},
	usdc: {
		symbol: "USDC",
		name: "USD Coin",
		decimals: 6,
		icon: "$",
		color: "#2775CA",
	},
}

export const mockSwapState = {
	tokenIn: mockTokens.eth,
	tokenOut: mockTokens.usdc,
	amountIn: "1.5",
	amountOut: "3750.00",
	rate: "2500.00",
	balanceIn: "4.2847",
	balanceOut: "12,450.32",
	slippage: 0.5,
	priceImpact: 0.02,
	networkFee: "$2.34",
}

export const mockIntentPhases = [
	{ id: "approving", label: "Approving", status: "complete" },
	{ id: "submitting", label: "Submitting", status: "complete" },
	{ id: "submitted", label: "Submitted", status: "current" },
	{ id: "processing", label: "Processing", status: "pending" },
	{ id: "settling", label: "Settling", status: "pending" },
	{ id: "filled", label: "Filled", status: "pending" },
] as const

export const mockTxHash = "0x1234...abcd"
export const mockIntentId = "0xabcd...1234"
