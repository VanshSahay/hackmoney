export const intentRegistryAbi = [
	{
		type: "function",
		name: "createIntent",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "tokenIn", type: "address" },
			{ name: "tokenOut", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [{ name: "intentId", type: "bytes32" }],
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
					{ name: "creator", type: "address" },
					{ name: "tokenIn", type: "address" },
					{ name: "tokenOut", type: "address" },
					{ name: "amount", type: "uint256" },
					{ name: "filled", type: "bool" },
					{ name: "createdAt", type: "uint256" },
				],
			},
		],
	},
	{
		type: "function",
		name: "totalIntents",
		stateMutability: "view",
		inputs: [],
		outputs: [{ name: "", type: "uint256" }],
	},
	{
		type: "function",
		name: "mockFill",
		stateMutability: "nonpayable",
		inputs: [{ name: "intentId", type: "bytes32" }],
		outputs: [],
	},
	{
		type: "event",
		name: "IntentCreated",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "creator", type: "address", indexed: true },
			{ name: "tokenIn", type: "address", indexed: false },
			{ name: "tokenOut", type: "address", indexed: false },
			{ name: "amount", type: "uint256", indexed: false },
		],
	},
	{
		type: "event",
		name: "IntentFilled",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "amountOut", type: "uint256", indexed: false },
		],
	},
] as const
