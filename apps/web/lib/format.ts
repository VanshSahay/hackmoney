import { formatUnits } from "viem"

/** Format a bigint token amount to human-readable string */
export function formatTokenAmount(
	amount: bigint,
	decimals: number,
	maxDecimals = 4,
): string {
	const formatted = formatUnits(amount, decimals)
	const [whole, frac] = formatted.split(".")
	if (!frac) return whole
	return `${whole}.${frac.slice(0, maxDecimals).replace(/0+$/, "") || "0"}`
}

/** Truncate an address to 0x1234...abcd */
export function truncateAddress(address: string, chars = 4): string {
	return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/** Format USD value */
export function formatUSD(value: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value)
}
