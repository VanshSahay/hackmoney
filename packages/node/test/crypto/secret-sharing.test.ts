/**
 * Unit tests for secret sharing protocols
 */

import { describe, expect, it } from "vitest"
import { FIELD_PRIME } from "../../src/crypto/field.js"
import {
	addShares,
	generateBeaverTriple,
	getPartyShares,
	mulSharesByConstant,
	reconstruct3Party,
	reconstructFromTwoParties,
	secretShare3Party,
	shamirReconstruct,
	shamirShare,
	subShares,
} from "../../src/crypto/secret-sharing.js"

describe("Secret Sharing", () => {
	describe("3-Party Replicated Secret Sharing", () => {
		it("should correctly share and reconstruct a secret", () => {
			const secret = 12345n
			const shares = secretShare3Party(secret)
			const reconstructed = reconstruct3Party(shares)
			expect(reconstructed).toBe(secret)
		})

		it("should work with zero", () => {
			const secret = 0n
			const shares = secretShare3Party(secret)
			const reconstructed = reconstruct3Party(shares)
			expect(reconstructed).toBe(secret)
		})

		it("should work with large numbers", () => {
			const secret = FIELD_PRIME - 100n
			const shares = secretShare3Party(secret)
			const reconstructed = reconstruct3Party(shares)
			expect(reconstructed).toBe(secret)
		})

		it("should generate different shares each time", () => {
			const secret = 12345n
			const shares1 = secretShare3Party(secret)
			const shares2 = secretShare3Party(secret)

			// Shares should be different (due to randomness)
			const different =
				shares1.share1 !== shares2.share1 ||
				shares1.share2 !== shares2.share2 ||
				shares1.share3 !== shares2.share3
			expect(different).toBe(true)

			// But both should reconstruct to same secret
			expect(reconstruct3Party(shares1)).toBe(secret)
			expect(reconstruct3Party(shares2)).toBe(secret)
		})

		it("should maintain sum property: share1 + share2 + share3 = secret", () => {
			const secret = 12345n
			const shares = secretShare3Party(secret)
			const sum = (shares.share1 + shares.share2 + shares.share3) % FIELD_PRIME
			expect(sum).toBe(secret)
		})
	})

	describe("getPartyShares", () => {
		it("should correctly distribute shares to party 0", () => {
			const allShares = secretShare3Party(1000n)
			const party0Shares = getPartyShares(allShares, 0)
			expect(party0Shares.share1).toBe(allShares.share1)
			expect(party0Shares.share2).toBe(allShares.share2)
		})

		it("should correctly distribute shares to party 1", () => {
			const allShares = secretShare3Party(1000n)
			const party1Shares = getPartyShares(allShares, 1)
			expect(party1Shares.share1).toBe(allShares.share2)
			expect(party1Shares.share2).toBe(allShares.share3)
		})

		it("should correctly distribute shares to party 2", () => {
			const allShares = secretShare3Party(1000n)
			const party2Shares = getPartyShares(allShares, 2)
			expect(party2Shares.share1).toBe(allShares.share3)
			expect(party2Shares.share2).toBe(allShares.share1)
		})

		it("should throw for invalid party ID", () => {
			const allShares = secretShare3Party(1000n)
			expect(() => getPartyShares(allShares, 3)).toThrow()
			expect(() => getPartyShares(allShares, -1)).toThrow()
		})
	})

	describe("reconstructFromTwoParties", () => {
		it("should reconstruct secret from party 0 and party 1", () => {
			const secret = 12345n
			const allShares = secretShare3Party(secret)
			const party0 = getPartyShares(allShares, 0)
			const party1 = getPartyShares(allShares, 1)

			const reconstructed = reconstructFromTwoParties(party0, party1, 0, 1)
			expect(reconstructed).toBe(secret)
		})

		it("should reconstruct secret from party 1 and party 2", () => {
			const secret = 67890n
			const allShares = secretShare3Party(secret)
			const party1 = getPartyShares(allShares, 1)
			const party2 = getPartyShares(allShares, 2)

			const reconstructed = reconstructFromTwoParties(party1, party2, 1, 2)
			expect(reconstructed).toBe(secret)
		})

		it("should reconstruct secret from party 0 and party 2", () => {
			const secret = 99999n
			const allShares = secretShare3Party(secret)
			const party0 = getPartyShares(allShares, 0)
			const party2 = getPartyShares(allShares, 2)

			const reconstructed = reconstructFromTwoParties(party0, party2, 0, 2)
			expect(reconstructed).toBe(secret)
		})
	})

	describe("Share Arithmetic", () => {
		describe("addShares", () => {
			it("should add shares homomorphically", () => {
				const secretA = 100n
				const secretB = 200n

				const sharesA = secretShare3Party(secretA)
				const sharesB = secretShare3Party(secretB)

				const party0A = getPartyShares(sharesA, 0)
				const party0B = getPartyShares(sharesB, 0)

				const sumShares = addShares(party0A, party0B)

				// The sum of shares should reconstruct to sum of secrets
				// (when all parties do the same)
				const party1A = getPartyShares(sharesA, 1)
				const party1B = getPartyShares(sharesB, 1)
				const party1Sum = addShares(party1A, party1B)

				const party2A = getPartyShares(sharesA, 2)
				const party2B = getPartyShares(sharesB, 2)
				const party2Sum = addShares(party2A, party2B)

				const reconstructed = reconstruct3Party({
					share1: sumShares.share1,
					share2: party1Sum.share1,
					share3: party2Sum.share1,
				})

				expect(reconstructed).toBe((secretA + secretB) % FIELD_PRIME)
			})
		})

		describe("subShares", () => {
			it("should subtract shares homomorphically", () => {
				const secretA = 300n
				const secretB = 100n

				const sharesA = secretShare3Party(secretA)
				const sharesB = secretShare3Party(secretB)

				const party0A = getPartyShares(sharesA, 0)
				const party0B = getPartyShares(sharesB, 0)

				const diffShares = subShares(party0A, party0B)

				// Verify with other parties
				const party1A = getPartyShares(sharesA, 1)
				const party1B = getPartyShares(sharesB, 1)
				const party1Diff = subShares(party1A, party1B)

				const party2A = getPartyShares(sharesA, 2)
				const party2B = getPartyShares(sharesB, 2)
				const party2Diff = subShares(party2A, party2B)

				const reconstructed = reconstruct3Party({
					share1: diffShares.share1,
					share2: party1Diff.share1,
					share3: party2Diff.share1,
				})

				expect(reconstructed).toBe(
					(secretA - secretB + FIELD_PRIME) % FIELD_PRIME,
				)
			})
		})

		describe("mulSharesByConstant", () => {
			it("should multiply shares by a constant", () => {
				const secret = 100n
				const constant = 5n

				const shares = secretShare3Party(secret)
				const party0 = getPartyShares(shares, 0)

				const mulShares = mulSharesByConstant(party0, constant)

				// Do the same for all parties
				const party1 = getPartyShares(shares, 1)
				const party1Mul = mulSharesByConstant(party1, constant)

				const party2 = getPartyShares(shares, 2)
				const party2Mul = mulSharesByConstant(party2, constant)

				const reconstructed = reconstruct3Party({
					share1: mulShares.share1,
					share2: party1Mul.share1,
					share3: party2Mul.share1,
				})

				expect(reconstructed).toBe((secret * constant) % FIELD_PRIME)
			})
		})
	})

	describe("Beaver Triples", () => {
		it("should generate valid beaver triples", () => {
			for (let partyId = 0; partyId < 3; partyId++) {
				const triple = generateBeaverTriple(partyId)

				// Each triple should have a, b, c shares
				expect(triple.a).toBeDefined()
				expect(triple.b).toBeDefined()
				expect(triple.c).toBeDefined()

				// Shares should have share1 and share2
				expect(triple.a.share1).toBeDefined()
				expect(triple.a.share2).toBeDefined()
				expect(triple.b.share1).toBeDefined()
				expect(triple.b.share2).toBeDefined()
				expect(triple.c.share1).toBeDefined()
				expect(triple.c.share2).toBeDefined()
			}
		})

		it("should generate different triples each time", () => {
			const triple1 = generateBeaverTriple(0)
			const triple2 = generateBeaverTriple(0)

			const different =
				triple1.a.share1 !== triple2.a.share1 ||
				triple1.b.share1 !== triple2.b.share1 ||
				triple1.c.share1 !== triple2.c.share1

			expect(different).toBe(true)
		})
	})

	describe("Shamir Secret Sharing", () => {
		it("should share and reconstruct with threshold 2 of 3", () => {
			const secret = 12345n
			const threshold = 2
			const numParties = 3

			const shares = shamirShare(secret, threshold, numParties)
			expect(shares.length).toBe(numParties)

			// Reconstruct with any 2 shares
			const reconstructed = shamirReconstruct([shares[0], shares[1]])
			expect(reconstructed).toBe(secret)
		})

		it("should work with different subsets of threshold shares", () => {
			const secret = 67890n
			const threshold = 3
			const numParties = 5

			const shares = shamirShare(secret, threshold, numParties)

			// Try different combinations of 3 shares
			const combo1 = shamirReconstruct([shares[0], shares[1], shares[2]])
			const combo2 = shamirReconstruct([shares[1], shares[2], shares[3]])
			const combo3 = shamirReconstruct([shares[0], shares[3], shares[4]])

			expect(combo1).toBe(secret)
			expect(combo2).toBe(secret)
			expect(combo3).toBe(secret)
		})

		it("should work with threshold = numParties (no redundancy)", () => {
			const secret = 99999n
			const threshold = 3
			const numParties = 3

			const shares = shamirShare(secret, threshold, numParties)
			const reconstructed = shamirReconstruct(shares)

			expect(reconstructed).toBe(secret)
		})

		it("should throw if threshold exceeds numParties", () => {
			expect(() => shamirShare(1000n, 5, 3)).toThrow()
		})

		it("should handle edge case of threshold 1", () => {
			const secret = 42n
			const shares = shamirShare(secret, 1, 5)

			// Any single share should reconstruct to secret
			for (let i = 0; i < shares.length; i++) {
				const reconstructed = shamirReconstruct([shares[i]])
				expect(reconstructed).toBe(secret)
			}
		})
	})

	describe("Security Properties", () => {
		it("single share should reveal no information (looks random)", () => {
			const secret = 12345n
			const shares1 = secretShare3Party(secret)
			const shares2 = secretShare3Party(secret)

			// Individual shares should be different even for same secret
			expect(shares1.share1).not.toBe(shares2.share1)
		})

		it("shares should be uniformly distributed in field", () => {
			const secret = 12345n
			const numSamples = 100
			const share1Values = new Set<bigint>()

			for (let i = 0; i < numSamples; i++) {
				const shares = secretShare3Party(secret)
				share1Values.add(shares.share1)
			}

			// Should have many unique values (high entropy)
			expect(share1Values.size).toBeGreaterThan(numSamples * 0.95)
		})
	})
})
