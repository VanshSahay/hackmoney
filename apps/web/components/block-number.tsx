import { baseClient } from "@/lib/viem"

/** Server component — fetches latest Base block number at request time. */
export async function BlockNumber() {
	const blockNumber = await baseClient.getBlockNumber()

	return (
		<p className="text-sm text-neutral-500">
			Latest Base block: <strong>{blockNumber.toString()}</strong>
		</p>
	)
}
