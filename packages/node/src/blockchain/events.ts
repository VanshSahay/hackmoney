/**
 * Blockchain Event Listener
 * Listens for IntentCreated events from Settlement contract
 */

import {
	type Address,
	type Chain,
	createPublicClient,
	type Hash,
	http,
	type Log,
	parseAbiItem,
	webSocket,
} from "viem"
import { hardhat, mainnet, sepolia } from "viem/chains"
import type { Intent, IntentId } from "../types.js"

// Define the event ABI as a const for type inference
const IntentCreatedEventAbi = parseAbiItem(
	"event IntentCreated(bytes32 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)",
)

type IntentCreatedLog = Log<
	bigint,
	number,
	false,
	typeof IntentCreatedEventAbi,
	true
>

/**
 * Intent event from the Settlement contract
 */
export interface IntentCreatedEvent {
	intentId: IntentId
	user: Address
	tokenIn: Address
	tokenOut: Address
	amountIn: bigint
	minAmountOut: bigint
	deadline: bigint
	blockNumber: bigint
	transactionHash: Hash
}

export type IntentEventHandler = (
	event: IntentCreatedEvent,
) => void | Promise<void>

/**
 * Blockchain Event Listener
 */
export class BlockchainEventListener {
	private publicClient: ReturnType<typeof createPublicClient>
	private settlementAddress: Address
	private eventHandlers: IntentEventHandler[] = []
	private isListening = false
	private unwatch?: () => void
	private chain: Chain

	constructor(
		rpcUrl: string,
		settlementAddress: Address,
		chainId: number = 1,
		wsRpcUrl?: string,
	) {
		this.chain = this.getChain(chainId)

		// Use WebSocket if available for real-time events
		const transport = wsRpcUrl
			? webSocket(wsRpcUrl)
			: http(rpcUrl, { batch: true })

		this.publicClient = createPublicClient({
			chain: this.chain,
			transport,
		})

		this.settlementAddress = settlementAddress

		if (wsRpcUrl) {
			console.log("🔌 Using WebSocket for real-time event listening")
		}
	}

	/**
	 * Get chain configuration by ID
	 */
	private getChain(chainId: number): Chain {
		switch (chainId) {
			case 1:
				return mainnet
			case 11155111:
				return sepolia
			case 31337:
				return hardhat
			default:
				return {
					id: chainId,
					name: "Custom Chain",
					nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
					rpcUrls: {
						default: { http: [] },
						public: { http: [] },
					},
				} as Chain
		}
	}

	/**
	 * Start listening for IntentCreated events
	 */
	async startListening(): Promise<void> {
		if (this.isListening) {
			console.log("Already listening for events")
			return
		}

		console.log(
			`Starting to listen for IntentCreated events at ${this.settlementAddress}`,
		)

		// Watch for IntentCreated events
		this.unwatch = this.publicClient.watchEvent({
			address: this.settlementAddress,
			event: IntentCreatedEventAbi,
			onLogs: async (logs) => {
				for (const log of logs) {
					try {
						await this.handleIntentCreated(log as IntentCreatedLog)
					} catch (error) {
						console.error("Error handling IntentCreated event:", error)
					}
				}
			},
		})

		this.isListening = true
		console.log("Event listener started")
	}

	/**
	 * Handle an IntentCreated event
	 */
	private async handleIntentCreated(log: IntentCreatedLog): Promise<void> {
		const { args, blockNumber, transactionHash } = log

		const event: IntentCreatedEvent = {
			intentId: args.intentId,
			user: args.user,
			tokenIn: args.tokenIn,
			tokenOut: args.tokenOut,
			amountIn: args.amountIn,
			minAmountOut: args.minAmountOut,
			deadline: args.deadline,
			blockNumber,
			transactionHash,
		}

		console.log("IntentCreated event:", {
			intentId: event.intentId,
			user: event.user,
			amountIn: event.amountIn.toString(),
		})

		// Notify all handlers
		for (const handler of this.eventHandlers) {
			try {
				await handler(event)
			} catch (error) {
				console.error("Error in intent event handler:", error)
			}
		}
	}

	/**
	 * Register a handler for IntentCreated events
	 */
	onIntentCreated(handler: IntentEventHandler): void {
		this.eventHandlers.push(handler)
	}

	/**
	 * Stop listening for events
	 */
	stopListening(): void {
		if (this.unwatch) {
			this.unwatch()
			this.unwatch = undefined
		}
		this.isListening = false
		console.log("Event listener stopped")
	}

	/**
	 * Get the current block number
	 */
	async getCurrentBlock(): Promise<bigint> {
		return await this.publicClient.getBlockNumber()
	}

	/**
	 * Fetch historical IntentCreated events
	 */
	async fetchHistoricalIntents(
		fromBlock: bigint,
		toBlock?: bigint,
	): Promise<IntentCreatedEvent[]> {
		const logs = await this.publicClient.getLogs({
			address: this.settlementAddress,
			event: IntentCreatedEventAbi,
			fromBlock,
			toBlock: toBlock || "latest",
		})

		return logs.map((log) => ({
			intentId: log.args.intentId,
			user: log.args.user,
			tokenIn: log.args.tokenIn,
			tokenOut: log.args.tokenOut,
			amountIn: log.args.amountIn,
			minAmountOut: log.args.minAmountOut,
			deadline: log.args.deadline,
			blockNumber: log.blockNumber,
			transactionHash: log.transactionHash,
		}))
	}
}

/**
 * Convert IntentCreatedEvent to Intent type
 */
export function eventToIntent(event: IntentCreatedEvent): Intent {
	return {
		id: event.intentId,
		tokenIn: event.tokenIn,
		tokenOut: event.tokenOut,
		amountIn: event.amountIn,
		minAmountOut: event.minAmountOut,
		user: event.user,
		deadline: event.deadline,
		timestamp: Date.now(),
		status: "pending",
	}
}
