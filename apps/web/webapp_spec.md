# Webapp Plan: Privacy-Preserving MPC DEX Settlement Interface

## Overview

Build a minimal swap interface + LP showcase page for the intent-based MPC settlement protocol. Webapp watches on-chain events only (no direct MPC server communication). First demo uses real wallet tx + mock settlement timer.

---

## Route Structure

| Route | Purpose | Render |
|---|---|---|
| `/` | Swap interface + intent lifecycle tracker | Hybrid SSR shell, client swap form |
| `/lp` | Active LP showcase: registered servers, recent settlements, capacity utilization (no private data) | SSR + client refresh |
| `/intents/[id]` | Deep-link to single intent status (sharable) | Client |

---

## File Structure (new files only)

```
app/
  page.tsx                          # Rewrite: swap page
  lp/
    page.tsx                        # LP showcase page
  intents/
    [id]/
      page.tsx                      # Intent deep-link

components/
  layout/
    header.tsx                      # Nav bar + wallet
  swap/
    swap-card.tsx                   # Main swap widget
    token-input.tsx                 # Amount input + balance
    token-selector.tsx              # Token dropdown
    swap-button.tsx                 # Approve + swap CTA
  intent/
    intent-tracker.tsx              # Phase progress UI
    intent-phase-badge.tsx          # Status badge per phase
  lp/
    lp-table.tsx                    # Active LP list
    lp-stats.tsx                    # Aggregate stats (TVL, fills)
    recent-settlements.tsx          # Recent settlement feed

config/
  tokens.ts                        # Token addresses + metadata per chain
  contracts.ts                     # Contract addresses per chain

hooks/
  use-intent-lifecycle.ts           # Full swap->settle orchestration
  use-intent-status.ts              # Watch single intent on-chain
  use-token-balance.ts              # ERC20 balanceOf
  use-token-allowance.ts            # ERC20 allowance
  use-approve-token.ts              # ERC20 approve write
  use-swap.ts                       # Intent creation write
  use-mock-settlement.ts            # Timer-based mock for demo

lib/
  abis/
    erc20.ts                        # Standard ERC20 ABI (as const)
    intent-registry.ts              # Hook contract ABI stub
    settlement.ts                   # Settlement contract ABI stub
  format.ts                         # Amount formatting, address truncation
  constants.ts                      # Phase labels, timing

stores/
  intent-store.ts                   # Zustand: intent lifecycle state

types/
  intent.ts                         # IntentPhase, IntentState
  token.ts                          # Token, TokenAmount
```

---

## Core Design Decisions

### 1. On-chain events only, no MPC server coupling
Webapp watches `IntentCreated` and `IntentFilled` events via `useWatchContractEvent`. No WebSocket/HTTP to MPC servers. Status goes: Submitted -> Processing (opaque) -> Filled/Failed. Privacy maximized.

### 2. ABI management: `as const` literals, manual sync
Copy ABI arrays from `contracts/out/` into `lib/abis/*.ts` as `as const`. Wagmi v3 + Viem v2 infer all types. No codegen. For demo, ABIs are stubs matching the expected interface.

### 3. Contract addresses in code, not env
`config/contracts.ts` exports `Record<SupportedChainId, Address>` for each contract. Public data, gets type-checked.

### 4. Zustand for intent state
Intent lifecycle state (phase, txHash, intentId, etc.) lives in a Zustand store. Updated from event watchers outside React render cycle. Already bundled as wagmi transitive dep; add as explicit dep.

### 5. Mock settlement for demo
`use-mock-settlement.ts` hook: after swap tx confirms, simulate MPC phases with timed transitions (2s submitted -> 3s computing -> 2s allocating -> 2s settling -> filled). Swap to real event watching when contracts deploy.

### 6. SSR strategy
- Server: page shells, LP stats (cached reads via `lib/viem.ts`), token metadata
- Client: swap form, intent tracker, wallet-dependent data
- Pattern: RSC wrapper with `<Suspense>` for server data, client islands for interactive parts

---

## Swap Interface UX Flow

```
[Connect Wallet]
      |
[Swap Card]
  - Token In selector + amount input (USDC)
  - Token Out selector + amount input (ETH, computed)
  - Balance display, max button
  - Rate preview
  |
[Click "Swap"]
  |
  v
[Phase: Approving] -- wallet prompt for ERC20 approve (if needed)
  |
[Phase: Submitting] -- wallet prompt for swap tx (creates intent)
  |
[Phase: Submitted] -- tx confirmed, intent_id extracted from event
  |
[Phase: Processing] -- opaque MPC computation (mock: 5-7s timer)
  |                     UI shows animated progress bar + "Servers computing..."
  |
[Phase: Settling] -- settlement tx being submitted
  |
[Phase: Filled] -- IntentFilled event caught
  |                 UI shows: amounts, settlement tx link, server count
  |
  OR
  |
[Phase: Failed] -- timeout or insufficient capacity
                   UI shows: error message, retry button
```

Key UX: swap form and intent tracker are the SAME card. After submitting, form collapses into a compact summary and the phase tracker expands below it.

---

## LP Showcase Page (`/lp`)

Displays publicly observable on-chain data only:

1. **Active LP Table**: Registered server addresses, total settlements participated, uptime indicator
2. **Protocol Stats**: Total intents created, filled, fill rate, average settlement time
3. **Recent Settlements Feed**: Latest IntentFilled events with amounts + server count (not individual allocations - those are private)

Data source: server-side reads via `lib/viem.ts` + `getPublicClient()`. Cached with `revalidate` or TanStack Query `staleTime`.

LP individual capacities, allocations, and balances are NEVER shown (entire point of MPC privacy).

---

## Hook Architecture

### `useIntentLifecycle` (central orchestrator)
```
Inputs: tokenIn, tokenOut, amount
State: IntentStore (zustand)
Flow:
  1. Check allowance via useTokenAllowance
  2. If insufficient, call approve via useApproveToken -> phase: 'approving'
  3. Call swap via useSwap -> phase: 'submitting'
  4. On tx confirm, extract intent_id from logs -> phase: 'submitted'
  5. Start mock settlement timer (demo) OR watch IntentFilled event (prod)
  6. On settlement -> phase: 'filled'
```

### Supporting hooks
- `useTokenBalance(token)` -> `useReadContract(erc20Abi, 'balanceOf', [address])`
- `useTokenAllowance(token, spender)` -> `useReadContract(erc20Abi, 'allowance', [address, spender])`
- `useApproveToken()` -> `useWriteContract(erc20Abi, 'approve')`
- `useSwap()` -> `useWriteContract(routerAbi, 'swap')` (or mock intent creation)
- `useIntentStatus(intentId)` -> `useReadContract` + `useWatchContractEvent`

---

## Onchain Integration Details

### Minimizing RPC round trips
- Batch token balance + allowance into single `useReadContracts` (multicall)
- SSR pre-fetches token metadata (decimals, symbol) once, cached indefinitely
- `staleTime: 60_000` (already configured) prevents refetch storms
- `useWatchContractEvent` uses WebSocket subscription (single connection), not polling

### Type-safe contract interaction
```ts
// lib/abis/intent-registry.ts
export const intentRegistryAbi = [
  // Events
  { type: 'event', name: 'IntentCreated', inputs: [...] },
  { type: 'event', name: 'IntentFilled', inputs: [...] },
  // Functions
  { type: 'function', name: 'getIntent', inputs: [...], outputs: [...] },
] as const

// config/contracts.ts
export const INTENT_REGISTRY = {
  [baseSepolia.id]: '0x...' as const,
} satisfies Partial<Record<SupportedChainId, Address>>
```

Wagmi hooks then infer all argument/return types from the ABI automatically.

### Server-side reads (LP page, protocol stats)
```ts
// In RSC or Route Handler
const client = getPublicClient(baseSepolia)
const totalIntents = await client.readContract({
  address: INTENT_REGISTRY[baseSepolia.id],
  abi: intentRegistryAbi,
  functionName: 'totalIntents',
})
```

---

## First Demo Deliverable

**What the user sees:**
1. Connect wallet on Base Sepolia
2. Swap card: enter USDC amount, see ETH output estimate
3. Click Swap -> approve USDC -> submit intent tx (real on-chain)
4. Watch animated phase tracker: Submitted -> Processing (5-7s mock) -> Filled
5. See completion card with "settlement" details

**What's real:**
- Wallet connection, chain switching
- ERC20 approval transaction
- Mock "createIntent" contract call (simple contract that emits an event and stores intent data)
- UI phase tracker with all visual states

**What's mocked:**
- MPC computation (timer)
- Settlement (timer triggers phase transition)
- Output token delivery (no actual swap execution)
- LP data on `/lp` page (hardcoded or seeded from a script)

**Mock contract needed** (deploy to Base Sepolia):
A minimal `MockIntentRegistry` with:
- `createIntent(address tokenIn, address tokenOut, uint256 amount) -> bytes32 intentId` + emits `IntentCreated`
- `getIntent(bytes32) -> IntentData`
- `mockFill(bytes32 intentId)` (admin-only, for testing the filled event)

This mock contract lives in `contracts/src/` alongside the real contracts as they're developed.

---

## Dependencies to Add

```bash
pnpm add zustand
npx shadcn@latest add button card input badge select skeleton separator
```

---

## Implementation Order

1. **Types + config**: `types/`, `config/tokens.ts`, `config/contracts.ts`, `lib/constants.ts`
2. **Zustand store**: `stores/intent-store.ts`
3. **ABI stubs**: `lib/abis/erc20.ts`, `lib/abis/intent-registry.ts`
4. **shadcn components**: install button, card, input, badge, select, skeleton, separator
5. **Layout**: `components/layout/header.tsx`, update `app/layout.tsx`
6. **Swap UI**: token-input -> token-selector -> swap-card -> swap-button
7. **Intent tracker**: intent-phase-badge -> intent-tracker
8. **Hooks**: token-balance -> token-allowance -> approve -> swap -> mock-settlement -> intent-lifecycle
9. **Wire up**: `app/page.tsx` swap page with full flow
10. **LP page**: lp-stats -> lp-table -> recent-settlements -> `app/lp/page.tsx`
11. **Deploy mock contract** to Base Sepolia, update addresses
12. **End-to-end test**: real wallet tx -> mock settlement -> UI completion

---

## Verification

- `pnpm build` succeeds with no type errors
- `pnpm lint` passes
- Connect wallet on Base Sepolia, see balance
- Enter swap amount, click Swap, wallet prompts appear
- Phase tracker animates through all states
- LP page renders with placeholder data
- Mobile responsive, dark mode works
