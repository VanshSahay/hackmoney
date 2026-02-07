import type { Address } from "viem"
import { baseSepolia } from "viem/chains"
import { SETTLEMENT } from "#/config/contracts"
import { intentRegistryAbi } from "#/lib/abis/intent-registry"
import { baseSepoliaClient } from "#/lib/viem"

const settlementAddress = SETTLEMENT[baseSepolia.id]

export interface LpStats {
	totalNodes: number
	registeredNodes: Address[]
}

export interface NodeInfo {
	address: Address
	isRegistered: boolean
}

/**
 * Fetches LP/node data from the Settlement contract (server-side).
 */
export async function getLpStats(): Promise<LpStats> {
	if (!settlementAddress) {
		return { totalNodes: 0, registeredNodes: [] }
	}

	try {
		const [nodeCount, registeredNodes] = await Promise.all([
			baseSepoliaClient.readContract({
				address: settlementAddress,
				abi: intentRegistryAbi,
				functionName: "getNodeCount",
			}),
			baseSepoliaClient.readContract({
				address: settlementAddress,
				abi: intentRegistryAbi,
				functionName: "getRegisteredNodes",
			}),
		])

		return {
			totalNodes: Number(nodeCount),
			registeredNodes: registeredNodes as Address[],
		}
	} catch (error) {
		console.error("Failed to fetch LP stats:", error)
		return { totalNodes: 0, registeredNodes: [] }
	}
}

/**
 * Check if a specific node is registered.
 */
export async function isNodeRegistered(nodeAddress: Address): Promise<boolean> {
	if (!settlementAddress) return false

	try {
		const isRegistered = await baseSepoliaClient.readContract({
			address: settlementAddress,
			abi: intentRegistryAbi,
			functionName: "isNodeRegistered",
			args: [nodeAddress],
		})
		return isRegistered as boolean
	} catch {
		return false
	}
}

/**
 * Fetch recent IntentCreated and IntentFilled events for stats.
 */
export async function getIntentStats() {
	if (!settlementAddress) {
		return { totalIntents: 0, filledIntents: 0, fillRate: 0 }
	}

	try {
		// Get recent events (last ~10000 blocks ≈ ~1 day on Base)
		const currentBlock = await baseSepoliaClient.getBlockNumber()
		const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n

		const [createdLogs, filledLogs] = await Promise.all([
			baseSepoliaClient.getLogs({
				address: settlementAddress,
				event: {
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
				fromBlock,
				toBlock: currentBlock,
			}),
			baseSepoliaClient.getLogs({
				address: settlementAddress,
				event: {
					type: "event",
					name: "IntentFilled",
					inputs: [
						{ name: "intentId", type: "bytes32", indexed: true },
						{ name: "totalAmountOut", type: "uint256", indexed: false },
						{ name: "numNodes", type: "uint256", indexed: false },
					],
				},
				fromBlock,
				toBlock: currentBlock,
			}),
		])

		const totalIntents = createdLogs.length
		const filledIntents = filledLogs.length
		const fillRate = totalIntents > 0 ? (filledIntents / totalIntents) * 100 : 0

		return { totalIntents, filledIntents, fillRate }
	} catch (error) {
		console.error("Failed to fetch intent stats:", error)
		return { totalIntents: 0, filledIntents: 0, fillRate: 0 }
	}
}
