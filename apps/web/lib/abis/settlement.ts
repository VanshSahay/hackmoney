export const settlementAbi = [
	{
		type: "function",
		name: "settle",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "intentId", type: "bytes32" },
			{ name: "allocations", type: "uint256[]" },
		],
		outputs: [],
	},
	{
		type: "event",
		name: "Settled",
		inputs: [
			{ name: "intentId", type: "bytes32", indexed: true },
			{ name: "serverCount", type: "uint256", indexed: false },
		],
	},
] as const
