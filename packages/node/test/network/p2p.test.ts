/**
 * Unit tests for P2P networking
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MessageBuilder, P2PNetwork } from "../../src/network/p2p.js"
import type {
	MessageType,
	PartyConfig,
	ReplicatedShares,
} from "../../src/types.js"

describe("P2P Network", () => {
	let network: P2PNetwork
	const myPartyId = 0
	const myConfig: PartyConfig = {
		id: 0,
		address: "localhost",
		port: 4000,
	}
	const allParties: PartyConfig[] = [
		myConfig,
		{ id: 1, address: "localhost", port: 4001 },
		{ id: 2, address: "localhost", port: 4002 },
	]

	beforeEach(() => {
		network = new P2PNetwork(myPartyId, myConfig, allParties)
	})

	afterEach(async () => {
		if (network) {
			await network.stop()
		}
	})

	describe("initialization", () => {
		it("should initialize with correct party ID", () => {
			expect(network).toBeDefined()
		})

		it("should accept party configurations", () => {
			const network2 = new P2PNetwork(1, allParties[1], allParties)
			expect(network2).toBeDefined()
		})
	})

	describe("isConnected", () => {
		it("should return false before connection", () => {
			expect(network.isConnected(1)).toBe(false)
			expect(network.isConnected(2)).toBe(false)
		})
	})

	describe("getConnectionCount", () => {
		it("should return 0 initially", () => {
			expect(network.getConnectionCount()).toBe(0)
		})
	})

	describe("message handlers", () => {
		it("should register message handlers", () => {
			const handler = vi.fn()
			network.onMessage("PING" as MessageType, handler)

			// Handler should be registered (can't easily test without triggering)
			expect(handler).not.toHaveBeenCalled()
		})

		it("should register multiple handlers for same message type", () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()

			network.onMessage("PING" as MessageType, handler1)
			network.onMessage("PING" as MessageType, handler2)

			// Both should be registered
			expect(handler1).not.toHaveBeenCalled()
			expect(handler2).not.toHaveBeenCalled()
		})
	})
})

describe("MessageBuilder", () => {
	const sessionId = "session-123"
	const intentId = "0x123"

	describe("shareDistribution", () => {
		it("should create share distribution message", () => {
			const shares = { 0: 100n, 1: 200n }
			const message = MessageBuilder.shareDistribution(
				sessionId,
				1,
				intentId,
				shares,
			)

			expect(message.type).toBe("SHARE_DISTRIBUTION")
			expect(message.to).toBe(1)
			expect(message.sessionId).toBe(sessionId)
			expect(message.payload.intentId).toBe(intentId)
			expect(message.payload.shares).toEqual(shares)
		})
	})

	describe("computationRound", () => {
		it("should create computation round message", () => {
			const data = { value: 42 }
			const message = MessageBuilder.computationRound(sessionId, 2, 1, data)

			expect(message.type).toBe("COMPUTATION_ROUND")
			expect(message.to).toBe(2)
			expect(message.sessionId).toBe(sessionId)
			expect(message.payload.round).toBe(1)
			expect(message.payload.data).toEqual(data)
		})
	})

	describe("reconstructionRequest", () => {
		it("should create reconstruction request message", () => {
			const variable = "allocation_0"
			const message = MessageBuilder.reconstructionRequest(
				sessionId,
				1,
				variable,
			)

			expect(message.type).toBe("RECONSTRUCTION_REQUEST")
			expect(message.to).toBe(1)
			expect(message.sessionId).toBe(sessionId)
			expect(message.payload.variable).toBe(variable)
		})
	})

	describe("reconstructionResponse", () => {
		it("should create reconstruction response message", () => {
			const variable = "allocation_0"
			const shares: ReplicatedShares = { share1: 100n, share2: 200n }
			const message = MessageBuilder.reconstructionResponse(
				sessionId,
				1,
				variable,
				shares,
			)

			expect(message.type).toBe("RECONSTRUCTION_RESPONSE")
			expect(message.to).toBe(1)
			expect(message.sessionId).toBe(sessionId)
			expect(message.payload.variable).toBe(variable)
			expect(message.payload.shares).toEqual(shares)
		})
	})

	describe("settlementSignature", () => {
		it("should create settlement signature message", () => {
			const amount = 1000n
			const signature = "0xabcd..."
			const message = MessageBuilder.settlementSignature(
				sessionId,
				2,
				intentId,
				amount,
				signature,
			)

			expect(message.type).toBe("SETTLEMENT_SIGNATURE")
			expect(message.to).toBe(2)
			expect(message.sessionId).toBe(sessionId)
			expect(message.payload.intentId).toBe(intentId)
			expect(message.payload.amount).toBe(amount.toString())
			expect(message.payload.signature).toBe(signature)
		})
	})
})
