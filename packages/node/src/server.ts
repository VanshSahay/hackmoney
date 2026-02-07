/**
 * MPC Server
 * Main orchestration layer for privacy-preserving order splitting
 */

import type { Address, Hash } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import {
	BlockchainEventListener,
	eventToIntent,
	type IntentCreatedEvent,
} from "./blockchain/events.js"
import { SettlementManager } from "./blockchain/settlement.js"
import { FIELD_PRIME } from "./crypto/field.js"
import {
	getPartyShares,
	reconstructFromTwoParties,
	secretShare3Party,
	type ThreePartyShares,
} from "./crypto/secret-sharing.js"
import { TokenInventoryManager } from "./defi/inventory.js"
import { UniswapV4Manager } from "./defi/uniswap_v4.js"
import { MPCProtocols, type PartyShares } from "./mpc/protocols.js"
import { MPCSessionManager } from "./mpc/session.js"
import { MessageBuilder, P2PNetwork } from "./network/p2p.js"
import type {
	Allocation,
	Intent,
	IntentId,
	P2PMessage,
	PartyConfig,
	PartyId,
	ReplicatedShares,
	ServerCapacity,
	SettlementSignature,
} from "./types.js"
import { MessageType } from "./types.js"

/**
 * MPC Server Configuration
 */
export interface MPCServerConfig {
	partyId: PartyId
	myConfig: PartyConfig
	allParties: PartyConfig[]
	rpcUrl: string
	settlementAddress: Address
	privateKey: Hash
	chainId?: number
	enableAutoSwap?: boolean // Enable automatic token swapping
}

/**
 * MPC Server
 * Coordinates MPC computation for privacy-preserving order splitting
 */
export class MPCServer {
	private config: MPCServerConfig
	private sessionManager: MPCSessionManager
	private protocols: MPCProtocols
	private network: P2PNetwork
	private eventListener: BlockchainEventListener
	private settlementManager: SettlementManager
	private partyAddresses: Map<number, Address>
	private uniswapManager?: UniswapV4Manager
	private inventoryManager?: TokenInventoryManager

	// Server state
	private capacities: Map<string, ServerCapacity> = new Map()
	private activeIntents: Map<IntentId, Intent> = new Map()
	private pendingAllocations: Map<IntentId, Allocation> = new Map()
	private pendingSignatures: Map<IntentId, SettlementSignature[]> = new Map()

	// Track intents currently being processed to prevent concurrent execution
	private processingIntents: Set<IntentId> = new Set()

	// Received shares from other parties (per intent)
	private receivedShares: Map<IntentId, Map<PartyId, ReplicatedShares>> =
		new Map()

	// Computation round shares (per intent)
	private computationShares: Map<IntentId, Map<PartyId, ReplicatedShares>> =
		new Map()

	// Reconstruction responses: sessionId -> variable -> partyId -> shares
	private reconstructionResponses: Map<
		string,
		Map<string, Map<PartyId, ReplicatedShares>>
	> = new Map()

	constructor(config: MPCServerConfig) {
		this.config = config

		// Build party address mapping from config
		const partyAddresses = this.buildPartyAddresses(
			config.allParties,
			config.privateKey,
		)
		this.partyAddresses = partyAddresses

		// Initialize components
		this.sessionManager = new MPCSessionManager(config.partyId)
		this.protocols = new MPCProtocols(config.partyId, config.allParties.length)
		this.network = new P2PNetwork(
			config.partyId,
			config.myConfig,
			config.allParties,
		)

		// Initialize event listener with WebSocket if available
		const wsRpcUrl = process.env.WS_RPC_URL
		this.eventListener = new BlockchainEventListener(
			config.rpcUrl,
			config.settlementAddress,
			config.chainId,
			wsRpcUrl,
		)

		this.settlementManager = new SettlementManager({
			rpcUrl: config.rpcUrl,
			privateKey: config.privateKey,
			settlementAddress: config.settlementAddress,
			partyAddresses,
			chainId: config.chainId,
		})

		// Initialize Uniswap v4 and Inventory managers if auto-swap enabled
		if (config.enableAutoSwap !== false) {
			const v4Fee = process.env.UNISWAP_V4_FEE
				? parseInt(process.env.UNISWAP_V4_FEE, 10)
				: undefined
			const v4TickSpacing = process.env.UNISWAP_V4_TICK_SPACING
				? parseInt(process.env.UNISWAP_V4_TICK_SPACING, 10)
				: undefined
			const v4Hooks = process.env.UNISWAP_V4_HOOKS as Address | undefined

			this.uniswapManager = new UniswapV4Manager({
				rpcUrl: config.rpcUrl,
				privateKey: config.privateKey,
				chainId: config.chainId || 1,
				feeTier: v4Fee,
				tickSpacing: v4TickSpacing,
				hooks: v4Hooks,
			})

			this.inventoryManager = new TokenInventoryManager({
				uniswapManager: this.uniswapManager,
				defaultSlippage: 500, // 5%
			})

			console.log("🔄 Auto-swap enabled via Uniswap v4")
		}

		this.setupMessageHandlers()
		this.setupEventHandlers()
	}

	/**
	 * Build mapping of party IDs to blockchain addresses
	 */
	private buildPartyAddresses(
		allParties: PartyConfig[],
		myPrivateKey: Hash,
	): Map<number, Address> {
		const addresses = new Map<number, Address>()

		for (const party of allParties) {
			if (party.id === this.config.partyId) {
				// For self, derive address from private key
				const account = privateKeyToAccount(myPrivateKey)
				addresses.set(party.id, account.address)
			} else {
				// For other parties, use configured blockchain address if available
				// Otherwise, it will be shared during P2P handshake
				if (party.blockchainAddress) {
					addresses.set(party.id, party.blockchainAddress as Address)
				} else {
					// Use a placeholder - will be updated after handshake
					console.log(
						`⏳ Blockchain address for party ${party.id} will be received via P2P`,
					)
					addresses.set(
						party.id,
						"0x0000000000000000000000000000000000000000" as Address,
					)
				}
			}
		}

		return addresses
	}

	/**
	 * Start the MPC server
	 */
	async start(): Promise<void> {
		console.log(`Starting MPC Server (Party ${this.config.partyId})...`)

		// Check if node is registered
		const nodeAddress = this.settlementManager.getNodeAddress()
		const isRegistered =
			await this.settlementManager.isNodeRegistered(nodeAddress)

		if (!isRegistered) {
			console.warn("⚠️  WARNING: Node not registered with Settlement contract!")
			console.warn(`   Node address: ${nodeAddress}`)
			console.warn(
				"   Please register this node before participating in settlements.",
			)
			console.warn(
				`   Contract owner must call: registerNode("${nodeAddress}")`,
			)
		} else {
			console.log(`✅ Node registered with Settlement contract: ${nodeAddress}`)
		}

		// Start P2P network
		await this.network.start()

		// Start listening for blockchain events
		await this.eventListener.startListening()

		console.log("MPC Server started successfully")
		console.log(
			`Connections: ${this.network.getConnectionCount()}/${this.config.allParties.length - 1}`,
		)
	}

	/**
	 * Stop the MPC server
	 */
	async stop(): Promise<void> {
		console.log("Stopping MPC Server...")

		await this.network.stop()
		this.eventListener.stopListening()

		console.log("MPC Server stopped")
	}

	/**
	 * Set server capacity for a token
	 */
	setCapacity(tokenAddress: string, amount: bigint): void {
		// Normalize address to lowercase for case-insensitive lookups
		const normalizedAddress = tokenAddress.toLowerCase()
		this.capacities.set(normalizedAddress, {
			tokenAddress: normalizedAddress,
			amount,
			lastUpdated: Date.now(),
		})
		console.log(`Set capacity for ${normalizedAddress}: ${amount}`)
	}

	/**
	 * Get server capacity for a token
	 */
	getCapacity(tokenAddress: string): bigint {
		// Normalize address to lowercase for case-insensitive lookups
		const normalizedAddress = tokenAddress.toLowerCase()
		const capacity = this.capacities.get(normalizedAddress)
		return capacity ? capacity.amount : 0n
	}

	/**
	 * Setup P2P message handlers
	 */
	private setupMessageHandlers(): void {
		// Capture peer blockchain addresses from handshake messages
		this.network.onMessage(MessageType.HANDSHAKE_REQUEST, (msg: P2PMessage) => {
			this.handleHandshakeAddress(msg)
		})
		this.network.onMessage(
			MessageType.HANDSHAKE_RESPONSE,
			(msg: P2PMessage) => {
				this.handleHandshakeAddress(msg)
			},
		)

		// Handle share distribution messages
		this.network.onMessage(
			"SHARE_DISTRIBUTION" as MessageType,
			async (msg: P2PMessage) => {
				await this.handleShareDistribution(msg)
			},
		)

		// Handle computation round messages
		this.network.onMessage(
			"COMPUTATION_ROUND" as MessageType,
			async (msg: P2PMessage) => {
				await this.handleComputationRound(msg)
			},
		)

		// Handle reconstruction requests
		this.network.onMessage(
			MessageType.RECONSTRUCTION_REQUEST,
			async (msg: P2PMessage) => {
				await this.handleReconstructionRequest(msg)
			},
		)

		// Handle reconstruction responses
		this.network.onMessage(
			MessageType.RECONSTRUCTION_RESPONSE,
			async (msg: P2PMessage) => {
				await this.handleReconstructionResponse(msg)
			},
		)

		// Handle settlement signatures
		this.network.onMessage(
			MessageType.SETTLEMENT_SIGNATURE,
			async (msg: P2PMessage) => {
				await this.handleSettlementSignature(msg)
			},
		)
	}

	private handleHandshakeAddress(msg: P2PMessage): void {
		const address = msg.payload?.blockchainAddress as Address | undefined
		if (!address) {
			return
		}

		if (this.partyAddresses.get(msg.from) !== address) {
			this.partyAddresses.set(msg.from, address)
			console.log(
				`✅ Updated blockchain address for party ${msg.from}: ${address}`,
			)
		}
	}

	/**
	 * Setup blockchain event handlers
	 */
	private setupEventHandlers(): void {
		this.eventListener.onIntentCreated(async (event: IntentCreatedEvent) => {
			await this.handleIntentCreated(event)
		})
	}

	/**
	 * Handle IntentCreated event from blockchain
	 */
	private async handleIntentCreated(event: IntentCreatedEvent): Promise<void> {
		console.log(`\n=== New Intent Created ===`)
		console.log(`Intent ID: ${event.intentId}`)
		console.log(`Amount In: ${event.amountIn}`)
		console.log(`Token In: ${event.tokenIn}`)
		console.log(`Token Out: ${event.tokenOut}`)

		const intent = eventToIntent(event)

		// Check if this intent is already being processed
		if (this.processingIntents.has(intent.id)) {
			console.log(
				`Intent ${intent.id} is already being processed. Ignoring duplicate event.`,
			)
			return
		}

		// Mark intent as being processed
		this.processingIntents.add(intent.id)
		this.activeIntents.set(intent.id, intent)

		// Fetch capacity for the OUTPUT token (what nodes need to provide to fulfill the intent)
		// Note: tokenOut is what the nodes provide, tokenIn is what the user provides
		let myCapacity = this.getCapacity(event.tokenOut)

		// If we don't have cached capacity and have inventory manager, check on-chain balance
		if (myCapacity === 0n && this.inventoryManager) {
			console.log(`Checking on-chain balance for ${event.tokenOut}...`)
			const onChainBalance = await this.inventoryManager.getBalance(
				event.tokenOut,
				true,
			)

			if (onChainBalance > 0n) {
				console.log(`✅ Found on-chain balance: ${onChainBalance}`)
				this.setCapacity(event.tokenOut, onChainBalance)
				myCapacity = onChainBalance
			} else {
				// Seed holdings with tokenIn so swaps can use it as a source if available.
				// This helps exercise Uniswap integration when tokenOut balance is zero.
				await this.inventoryManager.getBalance(event.tokenIn, true)
				console.log(
					`No on-chain balance for ${event.tokenOut}, attempting to swap from other tokens...`,
				)

				const result = await this.inventoryManager.fulfillRequirement(
					event.tokenOut,
					event.minAmountOut / BigInt(this.config.allParties.length), // Estimate our share (tokenOut units)
				)

				if (result.success) {
					// Update capacity after swap
					const newBalance = await this.inventoryManager.getBalance(
						event.tokenOut,
						true,
					)
					this.setCapacity(event.tokenOut, newBalance)
					myCapacity = newBalance
					console.log(`✅ Swapped successfully! New capacity: ${myCapacity}`)
				} else {
					console.log(`❌ Could not swap to obtain ${event.tokenOut}`)
				}
			}
		}

		if (myCapacity === 0n) {
			console.log("No capacity for this token, participating with 0...")
		} else {
			console.log(`My capacity: ${myCapacity}`)
		}

		// Start MPC protocol
		await this.runMPCProtocol(intent, myCapacity)
	}

	/**
	 * Run the full MPC protocol for an intent
	 */
	private async runMPCProtocol(
		intent: Intent,
		myCapacity: bigint,
	): Promise<void> {
		try {
			console.log(`\n=== Starting MPC Protocol ===`)

			// Create session
			const parties = Array.from(
				{ length: this.config.allParties.length },
				(_, i) => i,
			)
			const session = this.sessionManager.createSession(intent.id, parties)
			this.sessionManager.updateSessionStatus(session.id, "sharing")

			// Transfer any pre-existing shares from receivedShares to session manager
			// This handles shares that arrived before session creation
			const preExistingShares = this.receivedShares.get(intent.id)
			if (preExistingShares) {
				for (const [fromParty, shares] of preExistingShares.entries()) {
					this.sessionManager.storeShares(
						session.id,
						`capacity_${fromParty}`,
						shares,
					)
				}
			}

			// Step 1: Secret share my capacity
			console.log("Step 1: Secret sharing capacity...")
			const allShares = secretShare3Party(myCapacity, FIELD_PRIME)
			const myShares = getPartyShares(allShares, this.config.partyId)

			// Store my shares
			this.sessionManager.storeShares(
				session.id,
				`capacity_${this.config.partyId}`,
				myShares,
			)

			// Step 2: Distribute shares to other parties
			console.log("Step 2: Distributing shares...")
			await this.distributeShares(session.id, intent.id, allShares)

			// Wait for shares from other parties
			console.log("Step 3: Waiting for shares from other parties...")
			await this.waitForAllShares(intent.id, parties.length)

			// Step 4: Compute sum of capacities
			console.log("Step 4: Computing total capacity (on shares)...")
			this.sessionManager.updateSessionStatus(session.id, "computing")

			const allCapacityShares: ReplicatedShares[] = []
			for (let i = 0; i < parties.length; i++) {
				const shares = this.sessionManager.getShares(
					session.id,
					`capacity_${i}`,
				)
				if (shares) {
					allCapacityShares.push(shares)
				}
			}

			const totalSumShares = this.protocols.computeSumShares(allCapacityShares)

			// Step 5: Check if sufficient capacity
			console.log("Step 5: Checking sufficient capacity...")
			const sufficient = await this.protocols.checkSufficientCapacity(
				totalSumShares,
				intent.minAmountOut,
				async (shares) => {
					// Exchange shares for sum reconstruction
					return await this.exchangeSharesForSum(intent.id, shares)
				},
			)

			console.log(`Sufficient capacity: ${sufficient}`)

			if (!sufficient) {
				console.log("Insufficient capacity, aborting...")
				this.sessionManager.updateSessionStatus(session.id, "failed")
				this.cleanupIntentState(intent.id)
				return
			}

			// Step 6: Compute allocations
			console.log("Step 6: Computing allocations...")

			let allocations: Array<{ partyId: number; amount: bigint }>

			// If my capacity is 0, all allocations will be 0 (optimization)
			if (myCapacity === 0n) {
				console.log(
					"My capacity is 0, skipping reconstruction (zero allocation)",
				)
				allocations = parties.map((_, i) => ({
					partyId: i,
					amount: 0n,
				}))
			} else {
				// For simplicity, we reveal capacities to compute allocations
				// In a fully private system, this would use secure division
				const capacities: bigint[] = []
				for (let i = 0; i < parties.length; i++) {
					let shares: ReplicatedShares | undefined

					if (i === this.config.partyId) {
						// Get my own shares from session manager
						shares = this.sessionManager.getShares(session.id, `capacity_${i}`)
					} else {
						// Get other parties' shares from receivedShares
						const intentShares = this.receivedShares.get(intent.id)
						if (intentShares) {
							shares = intentShares.get(i)
						}
					}

					if (shares) {
						// Request reconstruction
						const capacity = await this.reconstructValue(
							intent.id,
							`capacity_${i}`,
							shares,
						)
						capacities.push(capacity)
					} else {
						console.log(
							`⚠️  No shares found for capacity_${i}, assuming 0 capacity`,
						)
						capacities.push(0n)
					}
				}

				allocations = this.protocols.computeAllocations(
					capacities,
					intent.minAmountOut,
				)
			}

			const myAllocation = allocations[this.config.partyId]
			console.log(`My allocation: ${myAllocation.amount}`)
			this.pendingAllocations.set(intent.id, myAllocation)

			// Step 7: Approve tokenOut for settlement (each node approves its own allocation)
			if (myAllocation.amount > 0n && this.uniswapManager) {
				console.log(
					`Approving ${myAllocation.amount} of ${intent.tokenOut} for Settlement contract...`,
				)
				await this.uniswapManager.ensureApproval(
					intent.tokenOut as Address,
					this.settlementManager.getSettlementAddress(),
					myAllocation.amount,
				)
			}

			// Step 8: Sign settlement
			console.log("Step 8: Signing settlement...")
			const myBlockchainAddress = privateKeyToAccount(
				this.config.privateKey,
			).address
			const signature = await this.settlementManager.signSettlement(
				intent.id,
				myAllocation.amount,
				myBlockchainAddress,
			)

			const settlementSig: SettlementSignature = {
				partyId: this.config.partyId,
				intentId: intent.id,
				amount: myAllocation.amount,
				signature,
			}

			// Store my signature
			if (!this.pendingSignatures.has(intent.id)) {
				this.pendingSignatures.set(intent.id, [])
			}
			this.pendingSignatures.get(intent.id)?.push(settlementSig)

			// Step 9: Exchange signatures
			console.log("Step 9: Broadcasting signature...")
			await this.broadcastSignature(session.id, settlementSig)

			// Wait for all signatures
			console.log("Step 10: Waiting for all signatures...")
			await this.waitForAllSignatures(intent.id, parties.length)

			// Step 11: Submit settlement (if I'm the leader)
			if (this.config.partyId === 0) {
				console.log("Step 11: Submitting settlement (I am leader)...")
				await this.submitSettlement(intent.id, allocations)
			} else {
				console.log("Step 11: Waiting for leader to submit settlement...")
				// Non-leader parties don't submit, but still need to clean up
			}

			// Cleanup state for all parties
			this.cleanupIntentState(intent.id)

			this.sessionManager.updateSessionStatus(session.id, "completed")
			console.log("=== MPC Protocol Complete ===\n")
		} catch (error) {
			console.error("Error in MPC protocol:", error)

			// Update session status to 'failed' to allow proper cleanup
			const session = this.sessionManager.getSessionByIntent(intent.id)
			if (session) {
				this.sessionManager.updateSessionStatus(session.id, "failed")
			}

			// Cleanup state even on error to prevent memory leaks
			this.cleanupIntentState(intent.id)
		} finally {
			// Always remove from processing set, regardless of success or failure
			this.processingIntents.delete(intent.id)
		}
	}

	/**
	 * Distribute shares to other parties
	 */
	private async distributeShares(
		sessionId: string,
		intentId: IntentId,
		allShares: ThreePartyShares,
	): Promise<void> {
		for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
			if (partyId === this.config.partyId) continue

			const partyShares = getPartyShares(allShares, partyId)

			await this.network.sendToParty(
				partyId,
				MessageBuilder.shareDistribution(sessionId, partyId, intentId, {
					[this.config.partyId]: partyShares,
				}),
			)
		}
	}

	/**
	 * Handle incoming share distribution
	 */
	private async handleShareDistribution(msg: P2PMessage): Promise<void> {
		const { intentId, shares } = msg.payload
		const fromParty = msg.from

		console.log(
			`Received shares from party ${fromParty} for intent ${intentId}`,
		)

		// Store received shares
		if (!this.receivedShares.has(intentId)) {
			this.receivedShares.set(intentId, new Map())
		}

		const receivedShares = shares[fromParty]
		if (!receivedShares) {
			console.warn(
				`⚠️  No shares found in payload from party ${fromParty} for intent ${intentId}`,
			)
			return
		}

		// In replicated SS, we receive both shares that this party should hold
		this.receivedShares.get(intentId)?.set(fromParty, receivedShares)

		// Store in session
		const session = this.sessionManager.getSessionByIntent(intentId)
		if (session) {
			this.sessionManager.storeShares(
				session.id,
				`capacity_${fromParty}`,
				receivedShares,
			)
		}
	}

	/**
	 * Wait for shares from all parties
	 */
	private async waitForAllShares(
		intentId: IntentId,
		numParties: number,
	): Promise<void> {
		const timeout = 30000 // 30 seconds
		const start = Date.now()

		while (Date.now() - start < timeout) {
			const received = this.receivedShares.get(intentId)
			if (received && received.size >= numParties - 1) {
				// Received from all other parties
				return
			}
			await new Promise((resolve) => setTimeout(resolve, 500))
		}

		throw new Error("Timeout waiting for shares")
	}

	/**
	 * Exchange shares for sum computation
	 */
	private async exchangeSharesForSum(
		intentId: IntentId,
		myShares: ReplicatedShares,
	): Promise<PartyShares[]> {
		// Initialize a dedicated map for computation round shares if it doesn't exist
		// Keep this separate from capacity shares to avoid overwriting them.
		if (!this.computationShares.has(intentId)) {
			this.computationShares.set(intentId, new Map())
		}

		// Broadcast my shares
		for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
			if (partyId === this.config.partyId) continue

			await this.network.sendToParty(
				partyId,
				MessageBuilder.computationRound(intentId, partyId, 1, {
					shares: myShares,
				}),
			)
		}

		// Wait for shares from all other parties
		const expectedParties = this.config.allParties.length - 1 // Exclude self
		const timeout = 30000 // 30 seconds
		const startTime = Date.now()

		while (Date.now() - startTime < timeout) {
			const intentShares = this.computationShares.get(intentId)

			// Check if intentShares exists and has all expected parties
			if (intentShares && intentShares.size >= expectedParties) {
				// Collect shares from all other parties
				const collectedShares: PartyShares[] = []
				for (
					let partyId = 0;
					partyId < this.config.allParties.length;
					partyId++
				) {
					if (partyId === this.config.partyId) continue

					const shares = intentShares.get(partyId)
					if (shares) {
						collectedShares.push({ partyId, shares })
					}
				}

				// Double-check we have all shares before returning
				if (collectedShares.length >= expectedParties) {
					return collectedShares
				}
			}

			// Wait a bit before checking again
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		throw new Error(
			`Timeout waiting for shares from other parties for intent ${intentId}`,
		)
	}

	/**
	 * Handle computation round message
	 */
	private async handleComputationRound(msg: P2PMessage): Promise<void> {
		const intentId = msg.sessionId as IntentId
		const fromParty = msg.from
		const { shares } = msg.payload.data

		console.log(
			`Received computation round ${msg.payload.round} from party ${fromParty}`,
		)

		// Store received shares
		if (!this.computationShares.has(intentId)) {
			this.computationShares.set(intentId, new Map())
		}

		const intentShares = this.computationShares.get(intentId)
		intentShares.set(fromParty, shares)
	}

	/**
	 * Reconstruct a value with other parties
	 * For 3-party RSS, we need shares from at least one other party to get all 3 unique shares
	 */
	private async reconstructValue(
		intentId: IntentId,
		variable: string,
		myShares: ReplicatedShares,
	): Promise<bigint> {
		// Get the session for this intent
		const session = this.sessionManager.getSessionByIntent(intentId)
		if (!session) {
			throw new Error(`No session found for intent ${intentId}`)
		}

		// Determine which party to request from based on the variable name
		// For capacity_X, request from party X (the owner of those shares)
		let targetParty: number
		const capacityMatch = variable.match(/^capacity_(\d+)$/)
		if (capacityMatch) {
			targetParty = parseInt(capacityMatch[1], 10)
		} else {
			// For other variables, use next party in ring
			targetParty = (this.config.partyId + 1) % this.config.allParties.length
		}

		// Don't request shares from myself
		if (targetParty === this.config.partyId) {
			targetParty = (this.config.partyId + 1) % this.config.allParties.length
		}

		console.log(`Requesting shares for ${variable} from party ${targetParty}`)

		// Send reconstruction request with the actual session ID
		await this.network.sendToParty(
			targetParty,
			MessageBuilder.reconstructionRequest(session.id, targetParty, variable),
		)

		// Wait for response - use session.id to match the key used in storage
		const otherPartyShares = await this.waitForReconstructionResponse(
			session.id,
			variable,
			targetParty,
		)

		// Reconstruct using shares from both parties
		const reconstructed = reconstructFromTwoParties(
			myShares,
			otherPartyShares,
			this.config.partyId,
			targetParty,
		)

		console.log(`Reconstructed ${variable}: ${reconstructed}`)
		return reconstructed
	}

	/**
	 * Handle reconstruction request
	 */
	private async handleReconstructionRequest(msg: P2PMessage): Promise<void> {
		console.log(
			`Received RECONSTRUCTION_REQUEST from party ${msg.from} for variable ${msg.payload.variable}`,
		)
		const { variable } = msg.payload
		const session = this.sessionManager.getSession(msg.sessionId)

		console.log(`  Session found: ${!!session}`)
		if (session) {
			const shares = this.sessionManager.getShares(session.id, variable)
			console.log(`  Shares found for ${variable}: ${!!shares}`)
			if (shares) {
				console.log(`  Sending reconstruction response to party ${msg.from}...`)
				await this.network.sendToParty(
					msg.from,
					MessageBuilder.reconstructionResponse(
						msg.sessionId,
						msg.from,
						variable,
						shares,
					),
				)
				console.log(`  ✅ Sent reconstruction response`)
			} else {
				console.log(`  ❌ No shares found for variable ${variable}`)
			}
		} else {
			console.log(`  ❌ No session found for ${msg.sessionId}`)
		}
	}

	/**
	 * Handle reconstruction response
	 */
	private async handleReconstructionResponse(msg: P2PMessage): Promise<void> {
		const sessionId = msg.sessionId
		const { variable, shares } = msg.payload

		console.log(
			`Received reconstruction response for ${variable} from party ${msg.from}`,
		)

		// Initialize maps if needed
		if (!this.reconstructionResponses.has(sessionId)) {
			this.reconstructionResponses.set(sessionId, new Map())
		}

		const sessionMap = this.reconstructionResponses.get(sessionId)!
		if (!sessionMap.has(variable)) {
			sessionMap.set(variable, new Map())
		}

		// Store the shares
		const variableMap = sessionMap.get(variable)
		variableMap.set(msg.from, shares)
	}

	/**
	 * Wait for reconstruction response from a specific party
	 */
	private async waitForReconstructionResponse(
		sessionId: string,
		variable: string,
		fromParty: PartyId,
	): Promise<ReplicatedShares> {
		const timeout = 10000 // 10 seconds
		const startTime = Date.now()

		while (Date.now() - startTime < timeout) {
			const sessionMap = this.reconstructionResponses.get(sessionId)
			if (sessionMap) {
				const variableMap = sessionMap.get(variable)
				if (variableMap) {
					const shares = variableMap.get(fromParty)
					if (shares) {
						return shares
					}
				}
			}

			// Wait a bit before checking again
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		throw new Error(
			`Timeout waiting for reconstruction response for ${variable} from party ${fromParty}`,
		)
	}

	/**
	 * Broadcast settlement signature
	 */
	private async broadcastSignature(
		sessionId: string,
		signature: SettlementSignature,
	): Promise<void> {
		for (let partyId = 0; partyId < this.config.allParties.length; partyId++) {
			if (partyId === this.config.partyId) continue

			await this.network.sendToParty(
				partyId,
				MessageBuilder.settlementSignature(
					sessionId,
					partyId,
					signature.intentId,
					signature.amount,
					signature.signature,
				),
			)
		}
	}

	/**
	 * Handle settlement signature
	 */
	private async handleSettlementSignature(msg: P2PMessage): Promise<void> {
		const { intentId, amount, signature } = msg.payload

		console.log(`Received settlement signature from party ${msg.from}`)

		const sig: SettlementSignature = {
			partyId: msg.from,
			intentId,
			amount: BigInt(amount),
			signature,
		}

		if (!this.pendingSignatures.has(intentId)) {
			this.pendingSignatures.set(intentId, [])
		}
		this.pendingSignatures.get(intentId)?.push(sig)
	}

	/**
	 * Wait for all signatures
	 */
	private async waitForAllSignatures(
		intentId: IntentId,
		numParties: number,
	): Promise<void> {
		const timeout = 30000
		const start = Date.now()

		while (Date.now() - start < timeout) {
			const sigs = this.pendingSignatures.get(intentId)
			if (sigs && sigs.length >= numParties) {
				return
			}
			await new Promise((resolve) => setTimeout(resolve, 500))
		}

		throw new Error("Timeout waiting for signatures")
	}

	/**
	 * Cleanup state for a completed intent
	 * Called by all parties to prevent memory leaks
	 */
	private cleanupIntentState(intentId: IntentId): void {
		this.activeIntents.delete(intentId)
		this.pendingAllocations.delete(intentId)
		this.pendingSignatures.delete(intentId)
		this.receivedShares.delete(intentId)
		this.computationShares.delete(intentId)

		// Delete all reconstruction responses for sessions related to this intent
		// Session IDs have format: ${intentId}-${random}
		for (const sessionId of this.reconstructionResponses.keys()) {
			if (sessionId.startsWith(intentId)) {
				this.reconstructionResponses.delete(sessionId)
			}
		}

		console.log(`Cleaned up state for intent ${intentId}`)
	}

	/**
	 * Submit settlement to blockchain
	 */
	private async submitSettlement(
		intentId: IntentId,
		allocations: Allocation[],
	): Promise<void> {
		const signatures = this.pendingSignatures.get(intentId)
		if (!signatures) {
			throw new Error("No signatures available")
		}

		// Get intent to know which tokens to approve
		const intent = this.activeIntents.get(intentId)
		if (!intent) {
			throw new Error("Intent not found")
		}

		try {
			// Approve tokenOut for Settlement contract before submitting
			// Each node needs to approve their output amount
			const myAllocation = allocations.find(
				(a) => a.partyId === this.config.partyId,
			)
			if (myAllocation && myAllocation.amount > 0n) {
				console.log(
					`Approving ${myAllocation.amount} of ${intent.tokenOut} for Settlement contract...`,
				)

				if (this.uniswapManager) {
					await this.uniswapManager.ensureApproval(
						intent.tokenOut as Address,
						this.settlementManager.getSettlementAddress(),
						myAllocation.amount,
					)
				}
			}

			const hash = await this.settlementManager.submitSettlement(
				intentId,
				allocations,
				signatures,
			)
			console.log(`Settlement submitted: ${hash}`)
		} catch (error) {
			console.error("Error submitting settlement:", error)
			throw error
		}
	}
}
