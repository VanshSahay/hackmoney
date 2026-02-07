# Integration Guide: Settlement Contract + Nodes + UI

This guide shows how all the components work together in the MPC-based order splitting system.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER (Web UI)                          │
│                    apps/web/config/settlement.ts                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ createIntent()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT CONTRACT                          │
│              Base Sepolia: 0x56053B0ed4BB1b493c2B15FFa4BA21AF │
│                                                                 │
│  • Holds user funds in escrow                                   │
│  • Emits IntentCreated event                                    │
│  • Facilitates settlement with nodes                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Event: IntentCreated
                             │
                ┌────────────┴───────────┬────────────┐
                ▼                        ▼            ▼
┌───────────────────────┐   ┌──────────────┐   ┌──────────────┐
│    MPC NODE 1         │   │ MPC NODE 2   │   │ MPC NODE 3   │
│ packages/node/        │◄──┤              │──►│              │
│                       │   │              │   │              │
│ • Listens for events  │   │              │   │              │
│ • MPC computation     │   │              │   │              │
│ • Signs settlement    │   │              │   │              │
└───────────────────────┘   └──────────────┘   └──────────────┘
                │                    │                  │
                └────────────────────┴──────────────────┘
                             │
                             │ batchFillIntent()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SETTLEMENT CONTRACT                          │
│                                                                 │
│  • Distributes input tokens to nodes proportionally             │
│  • Collects output tokens from nodes                            │
│  • Sends output tokens to user                                  │
│  • Emits IntentFilled event                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Deploy Settlement Contract (✅ Done)

**Contract Address**: `0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4` (Base Sepolia)

### 2. Set Up MPC Nodes

```bash
cd packages/node

# Copy example config
cp .env.example .env

# Edit .env with your node configuration
# For Node 1 (alice.eth):
NODE_NAME=alice.eth
PEERS=bob.eth,charlie.eth
SETTLEMENT_ADDRESS=0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4
RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=84532

# Install dependencies and start
pnpm install
pnpm dev
```

**Repeat for Node 2 and Node 3** with different NODE_NAME values.

### 3. Register Nodes On-Chain

The contract owner must register nodes before they can participate:

```bash
cd contracts

# Using cast (Foundry CLI)
cast send 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4 \
  "registerNode(address)" \
  <NODE_1_ADDRESS> \
  --rpc-url https://base-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --private-key $PRIVATE_KEY

# Repeat for other nodes
```

### 4. Integrate UI

```typescript
// apps/web/components/swap-intent.tsx
import { useCreateIntent, useApproveToken } from '@/config/settlement';

export function SwapIntent() {
  const { createIntent, isPending, isSuccess } = useCreateIntent();
  const { approve, isPending: isApproving } = useApproveToken();

  const handleSwap = async () => {
    try {
      // 1. Approve tokens
      await approve(
        tokenInAddress,
        amountIn,
        tokenInDecimals
      );

      // 2. Create intent
      await createIntent({
        tokenIn: tokenInAddress,
        tokenOut: tokenOutAddress,
        amountIn: amountIn,
        minAmountOut: minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        decimalsIn: tokenInDecimals,
      });
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  return (
    <button onClick={handleSwap} disabled={isPending || isApproving}>
      {isApproving ? 'Approving...' : isPending ? 'Creating Intent...' : 'Swap'}
    </button>
  );
}
```

## Complete Flow Example

### Step 1: User Creates Intent

```typescript
// UI calls createIntent
const tx = await createIntent({
  tokenIn: '0xTokenA',
  tokenOut: '0xTokenB',
  amountIn: '1000',      // 1000 tokens
  minAmountOut: '950',   // Minimum 950 tokens out
  deadline: timestamp + 3600,
});
```

**What happens on-chain:**
1. User approves Settlement contract to spend tokenA
2. createIntent() is called
3. Contract transfers 1000 tokenA from user to itself
4. Contract emits `IntentCreated` event:
   ```solidity
   event IntentCreated(
     bytes32 intentId,
     address user,
     address tokenIn,   // 0xTokenA
     address tokenOut,  // 0xTokenB
     uint256 amountIn,  // 1000
     uint256 minAmountOut, // 950
     uint256 deadline
   )
   ```

### Step 2: Nodes Listen and Process

```typescript
// packages/node/src/server.ts
const listener = new BlockchainEventListener(
  config.rpcUrl,
  config.settlementAddress,
  config.chainId
);

listener.onIntentCreated(async (event) => {
  console.log('Intent received:', event.intentId);
  
  // Convert to internal Intent type
  const intent = eventToIntent(event);
  
  // Start MPC session to determine allocations
  const session = await mpcSession.computeAllocations(intent);
  
  // Get my allocation from MPC result
  const myAllocation = session.allocations.find(
    a => a.partyId === config.partyId
  );
  
  if (myAllocation) {
    // Sign the settlement
    const signature = await settlementManager.signSettlement(
      intent.id,
      myAllocation.amount,
      config.wallet.address
    );
    
    // Share signature with coordinator
    await p2p.shareSignature(signature);
  }
});
```

### Step 3: MPC Computation

The nodes use secure multi-party computation to:

1. **Share their capacities** (private, not revealed to other nodes)
2. **Compute allocations** based on:
   - Available liquidity per node
   - Fair distribution
   - Sufficient total to meet minAmountOut
3. **Reconstruct results** so each node knows their allocation

Example MPC result:
```typescript
{
  success: true,
  sufficient: true,
  allocations: [
    { partyId: 0, amount: 400n }, // Node 1 contributes 400 tokens
    { partyId: 1, amount: 350n }, // Node 2 contributes 350 tokens
    { partyId: 2, amount: 250n }, // Node 3 contributes 250 tokens
  ]
}
// Total: 1000 tokens (meets minAmountOut of 950)
```

### Step 4: Settlement Submission

One node (coordinator) submits the batch settlement:

```typescript
// packages/node/src/blockchain/settlement.ts
await settlementManager.submitSettlement(
  intentId,
  allocations,  // [{ partyId: 0, amount: 400 }, ...]
  signatures    // [sig0, sig1, sig2]
);
```

**What happens on-chain:**
1. Contract validates all signatures
2. Contract checks all nodes are registered
3. Contract verifies total output ≥ minAmountOut (1000 ≥ 950 ✓)
4. Contract distributes input tokens proportionally:
   - Node 1 receives: (400/1000) × 1000 = 400 tokenA
   - Node 2 receives: (350/1000) × 1000 = 350 tokenA
   - Node 3 receives: (250/1000) × 1000 = 250 tokenA
5. Contract pulls output tokens from nodes:
   - Node 1 transfers 400 tokenB to user
   - Node 2 transfers 350 tokenB to user
   - Node 3 transfers 250 tokenB to user
6. Contract marks intent as Filled
7. Contract emits `IntentFilled` event

### Step 5: User Receives Tokens

User now has:
- Lost: 1000 tokenA
- Gained: 1000 tokenB
- Intent status: Filled ✅

## Key Contract Functions

### createIntent (Called by UI)

```solidity
function createIntent(
    address tokenIn,      // Input token address
    address tokenOut,     // Output token address
    uint256 amountIn,     // Amount to swap
    uint256 minAmountOut, // Minimum acceptable output
    uint256 deadline      // Deadline timestamp
) external returns (bytes32 intentId)
```

**Requirements:**
- User must approve Settlement contract first
- All parameters must be valid (non-zero, deadline in future)

### batchFillIntent (Called by Nodes)

```solidity
function batchFillIntent(
    bytes32 intentId,           // Intent to fill
    address[] calldata nodes,   // Node addresses
    uint256[] calldata amounts, // Output amounts per node
    bytes[] calldata signatures // Signatures from each node
) external
```

**Requirements:**
- Intent must be Pending
- Not past deadline
- At least `minNodesRequired` nodes (default: 2)
- All nodes must be registered
- Total output ≥ minAmountOut
- Each node must approve Settlement contract for their output tokens

### cancelIntent (Called by User)

```solidity
function cancelIntent(bytes32 intentId) external
```

Cancels intent and refunds tokens to user.

## Testing the Complete System

### 1. Run Tests

```bash
# Test smart contract
cd contracts
forge test --match-contract SettlementTest --offline

# Test node system
cd ../packages/node
pnpm test
```

### 2. Integration Test

```bash
# Terminal 1: Start Node 1
cd packages/node
NODE_NAME=alice.eth PEERS=bob.eth,charlie.eth pnpm dev

# Terminal 2: Start Node 2
NODE_NAME=bob.eth PEERS=alice.eth,charlie.eth pnpm dev

# Terminal 3: Start Node 3
NODE_NAME=charlie.eth PEERS=alice.eth,bob.eth pnpm dev

# Terminal 4: Start UI
cd apps/web
pnpm dev

# Open browser to http://localhost:3000
# Connect wallet and create swap intent
```

## Environment Configuration

### Node Configuration (.env)

```bash
NODE_NAME=alice.eth
PEERS=bob.eth,charlie.eth
PORT=auto
SETTLEMENT_ADDRESS=0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4
RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=84532

# Optional: Pre-configure capacities
CAPACITY_TOKEN_0=0xTokenBAddress
CAPACITY_AMOUNT_0=10000000000000000000000

# Wallet (auto-generated if not provided)
# PRIVATE_KEY=0x...
```

### UI Configuration

Already configured in `apps/web/config/settlement.ts` with:
- Contract address
- Contract ABI
- React hooks for interactions

## Security Considerations

1. **Node Registration**: Only owner can register nodes
2. **Signature Validation**: Each node must sign their allocation
3. **Deadline Enforcement**: Intents expire after deadline
4. **Status Checks**: Intents can only be filled once
5. **Minimum Nodes**: Requires at least N nodes for decentralization
6. **ReentrancyGuard**: Protection against reentrancy attacks
7. **SafeERC20**: Safe token transfer operations

## Monitoring and Debugging

### Watch Events

```bash
# Watch for IntentCreated events
cast logs \
  --address 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4 \
  'IntentCreated(bytes32,address,address,address,uint256,uint256,uint256)' \
  --rpc-url https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Watch for IntentFilled events
cast logs \
  --address 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4 \
  'IntentFilled(bytes32,uint256,uint256)' \
  --rpc-url https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Check Intent Status

```bash
cast call 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4 \
  "getIntentStatus(bytes32)" \
  <INTENT_ID> \
  --rpc-url https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Returns: 0 (Pending), 1 (Filled), 2 (Cancelled)
```

### Node Logs

Nodes output detailed logs:
```
[INFO] Intent received: 0x1234...
[INFO] Starting MPC session...
[INFO] MPC computation complete
[INFO] My allocation: 400 tokens
[INFO] Signing settlement...
[INFO] Settlement submitted: 0xabcd...
```

## Next Steps

1. ✅ Settlement contract deployed
2. ✅ Node infrastructure ready
3. ✅ UI integration code provided
4. 🔄 Register your nodes on-chain
5. 🔄 Configure node .env files
6. 🔄 Start nodes
7. 🔄 Test end-to-end flow

## Support

- Contract Source: `contracts/src/Settlement.sol`
- Contract Tests: `contracts/test/Settlement.t.sol`
- Node Source: `packages/node/src/`
- UI Integration: `apps/web/config/settlement.ts`
- Documentation: `contracts/SETTLEMENT.md`
