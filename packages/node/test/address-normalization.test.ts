/**
 * Test for address normalization in capacity lookups
 * Verifies that token addresses are case-insensitive
 */

import type { Address, Hash } from "viem"
import { describe, expect, it } from "vitest"
import type { MPCServerConfig } from "../src/server.js"
import { MPCServer } from "../src/server.js"

describe("Address Normalization", () => {
	// Create minimal test config
	const createTestConfig = (): MPCServerConfig => ({
		partyId: 0,
		myConfig: {
			id: 0,
			address: "localhost",
			port: 3000,
		},
		allParties: [
			{ id: 0, address: "localhost", port: 3000 },
			{
				id: 1,
				address: "localhost",
				port: 3001,
				blockchainAddress:
					"0x1111111111111111111111111111111111111111" as Address,
			},
			{
				id: 2,
				address: "localhost",
				port: 3002,
				blockchainAddress:
					"0x2222222222222222222222222222222222222222" as Address,
			},
		],
		rpcUrl: "http://localhost:8545",
		hookAddress: "0xHookAddress000000000000000000000000000000" as Address,
		settlementAddress: "0xSettlement0000000000000000000000000000000" as Address,
		privateKey:
			"0x0000000000000000000000000000000000000000000000000000000000000001" as Hash,
		chainId: 31337,
	})

	it("should handle uppercase addresses when storing capacity", () => {
		const server = new MPCServer(createTestConfig())
		const tokenAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
		const amount = 1000n

		server.setCapacity(tokenAddress, amount)

		// Should retrieve with exact same address
		expect(server.getCapacity(tokenAddress)).toBe(amount)
	})

	it("should handle lowercase addresses when storing capacity", () => {
		const server = new MPCServer(createTestConfig())
		const tokenAddress = "0xabcdef1234567890abcdef1234567890abcdef12"
		const amount = 2000n

		server.setCapacity(tokenAddress, amount)

		// Should retrieve with exact same address
		expect(server.getCapacity(tokenAddress)).toBe(amount)
	})

	it("should normalize addresses for case-insensitive lookups", () => {
		const server = new MPCServer(createTestConfig())
		const uppercaseAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
		const lowercaseAddress = "0xabcdef1234567890abcdef1234567890abcdef12"
		const mixedCaseAddress = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"
		const amount = 3000n

		// Store with uppercase
		server.setCapacity(uppercaseAddress, amount)

		// Should retrieve with lowercase (mimics blockchain event)
		expect(server.getCapacity(lowercaseAddress)).toBe(amount)

		// Should retrieve with mixed case
		expect(server.getCapacity(mixedCaseAddress)).toBe(amount)

		// Should retrieve with original uppercase
		expect(server.getCapacity(uppercaseAddress)).toBe(amount)
	})

	it("should handle mixed case addresses from blockchain events", () => {
		const server = new MPCServer(createTestConfig())
		const configAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12" // Config might have uppercase
		const eventAddress = "0xabcdef1234567890abcdef1234567890abcdef12" // Events typically lowercase
		const amount = 5000n

		// Simulate config loading with uppercase address
		server.setCapacity(configAddress, amount)

		// Simulate blockchain event lookup with lowercase address
		const capacity = server.getCapacity(eventAddress)

		// Should find the capacity despite case difference
		expect(capacity).toBe(amount)
	})

	it("should return 0 for non-existent token addresses", () => {
		const server = new MPCServer(createTestConfig())
		const nonExistentAddress = "0x0000000000000000000000000000000000000000"

		expect(server.getCapacity(nonExistentAddress)).toBe(0n)
	})

	it("should update capacity for same address with different casing", () => {
		const server = new MPCServer(createTestConfig())
		const uppercaseAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
		const lowercaseAddress = "0xabcdef1234567890abcdef1234567890abcdef12"

		// Set initial capacity with uppercase
		server.setCapacity(uppercaseAddress, 1000n)

		// Update capacity with lowercase (should update same entry)
		server.setCapacity(lowercaseAddress, 2000n)

		// Should retrieve updated amount regardless of case used
		expect(server.getCapacity(uppercaseAddress)).toBe(2000n)
		expect(server.getCapacity(lowercaseAddress)).toBe(2000n)
	})
})
