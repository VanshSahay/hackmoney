// Settlement contract ABI - matches Settlement.sol on Base Sepolia
// Contract: 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4

export const intentRegistryAbi = [
	{
		type: "function",
		name: "createIntent",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "tokenIn", type: "address" },
			{ name: "tokenOut", type: "address" },
			{ name: "amountIn", type: "uint256" },
			{ name: "minAmountOut", type: "uint256" },
			{ name: "deadline", type: "uint256" },
		],
		outputs: [{ name: "intentId", type: "bytes32" }],
	},
	{
		type: "function",
		name: "cancelIntent",
		stateMutability: "nonpayable",
		inputs: [{ name: "intentId", type: "bytes32" }],
		outputs: [],
	},
	{
		type: "function",
		name: "getIntent",
		stateMutability: "view",
		inputs: [{ name: "intentId", type: "bytes32" }],
		outputs: [
			{
				name: "",
				type: "tuple",
				components: [
					{ name: "intentId", type: "bytes32" },
					{ name: "user", type: "address" },
					{ name: "tokenIn", type: "address" },
					{ name: "tokenOut", type: "address" },
					{ name: "amountIn", type: "uint256" },
					{ name: "minAmountOut", type: "uint256" },
					{ name: "deadline", type: "uint256" },
					{ name: "status", type: "uint8" },
					{ name: "createdAt", type: "uint256" },
				],
			},
		],
	},
	{
		type: "function",
		name: "getIntentStatus",
		stateMutability: "view",
		inputs: [{ name: "intentId", type: "bytes32" }],
		outputs: [{ name: "", type: "uint8" }],
	},
	{
		type: "function",
		name: "getRegisteredNodes",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "address[]" }],
	},
	{
		type: "function",
		name: "getNodeCount",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		type: "function",
		name: "isNodeRegistered",
		stateMutability: "view",
		inputs: [{ name: "node", type: "address" }],
		outputs: [{ name: "", type: "bool" }],
	},
	{
		type: "event",
		name: "IntentCreated",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "user", type: "address", indexed: true },
			{ name: "tokenIn", type: "address", indexed: false },
			{ name: "tokenOut", type: "address", indexed: false },
			{ name: "amountIn", type: "uint256", indexed: false },
			{ name: "minAmountOut", type: "uint256", indexed: false },
			{ name: "deadline", type: "uint256", indexed: false },
		],
	},
	{
		type: "event",
		name: "IntentFilled",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "totalAmountOut", type: "uint256", indexed: false },
			{ name: "numNodes", type: "uint256", indexed: false },
		],
	},
	{
		type: "event",
		name: "IntentCancelled",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "user", type: "address", indexed: true },
		],
	},
] as const

// ERC20 ABI for token approvals
export const erc20Abi = [
	{
		type: "function",
		name: "approve",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "spender", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "", type: "bool" }],
	},
	{
		type: "function",
		name: "allowance",
		stateMutability: "view",
		inputs: [
			{ name: "owner", type: "address" },
			{ name: "spender", type: "address" },
		],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		type: "function",
		name: "balanceOf",
		stateMutability: "view",
		inputs: [{ name: "account", type: "address" }],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		type: "function",
		name: "decimals",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint8" }],
	},
] as const

// Intent status enum matching contract
export const IntentStatus = {
	Pending: 0,
	Filled: 1,
	Cancelled: 2,
} as const

export type IntentStatusType = (typeof IntentStatus)[keyof typeof IntentStatus]
