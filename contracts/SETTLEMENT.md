# Settlement Contract

A Solidity smart contract for managing swap intents with MPC-based order splitting and settlement.

## Deployment

**Network**: Base Sepolia  
**Contract Address**: `0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4`  
**Owner**: `0x89fEdB2167197199Fd069122e5351A1C779F91B8`  
**Min Nodes Required**: 2

## Overview

The Settlement contract facilitates a decentralized order splitting system where:
1. Users create swap intents by depositing tokens
2. Events are emitted for MPC nodes to process
3. Nodes coordinate off-chain to split orders
4. Settlement is executed on-chain with contributions from multiple nodes

## Key Features

- **Intent Creation**: Users can create swap intents with deadlines
- **Event Emission**: `IntentCreated` events for nodes to listen to
- **Node Registration**: Only registered nodes can participate in settlements
- **Batch Settlement**: Multiple nodes fulfill an intent proportionally
- **Fund Safety**: Automatic refunds if intents are cancelled
- **Access Control**: Owner-managed node registration

## Contract Interface

### Main Functions

#### `createIntent`
```solidity
function createIntent(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
) external returns (bytes32 intentId)
```
Creates a new swap intent and deposits input tokens.

**Events emitted**:
- `IntentCreated(intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, deadline)`
- `FundsDeposited(intentId, user, tokenIn, amountIn)`

#### `batchFillIntent`
```solidity
function batchFillIntent(
    bytes32 intentId,
    address[] calldata nodes,
    uint256[] calldata amounts,
    bytes[] calldata signatures
) external
```
Fills an intent with contributions from multiple nodes. Nodes receive input tokens proportionally and transfer output tokens to the user.

**Events emitted**:
- `IntentFilled(intentId, totalAmountOut, numNodes)`
- `SettlementExecuted(intentId, node, amount)` (per node)
- `FundsWithdrawn(intentId, user, tokenOut, totalAmountOut)`

#### `cancelIntent`
```solidity
function cancelIntent(bytes32 intentId) external
```
Cancels a pending intent and refunds the user.

**Events emitted**:
- `IntentCancelled(intentId, user)`
- `FundsWithdrawn(intentId, user, tokenIn, amountIn)`

### Admin Functions

#### `registerNode`
```solidity
function registerNode(address node) external onlyOwner
```
Registers a node to participate in settlements.

#### `unregisterNode`
```solidity
function unregisterNode(address node) external onlyOwner
```
Unregisters a node from participating.

#### `updateMinNodesRequired`
```solidity
function updateMinNodesRequired(uint256 _minNodesRequired) external onlyOwner
```
Updates the minimum number of nodes required for settlement.

### View Functions

- `getIntent(bytes32 intentId)`: Get intent details
- `getIntentStatus(bytes32 intentId)`: Get intent status (0=Pending, 1=Filled, 2=Cancelled)
- `isNodeRegistered(address node)`: Check if node is registered
- `getRegisteredNodes()`: Get all registered nodes
- `getNodeCount()`: Get number of registered nodes

## Integration with Node System

### For UI (Frontend)

```typescript
// 1. Create an intent
const tx = await settlementContract.createIntent(
  tokenInAddress,
  tokenOutAddress,
  amountIn,
  minAmountOut,
  deadlineTimestamp
);
await tx.wait();

// 2. Listen for intent creation
settlementContract.on("IntentCreated", (intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, deadline) => {
  console.log("Intent created:", intentId);
});
```

### For Nodes (Backend)

The nodes in `packages/node/` are already set up to:

1. **Listen for IntentCreated events** (`src/blockchain/events.ts`)
```typescript
const listener = new BlockchainEventListener(
  rpcUrl,
  settlementAddress,
  chainId
);

listener.onIntentCreated(async (event) => {
  // Process intent with MPC
  const intent = eventToIntent(event);
  // ... MPC computation ...
});
```

2. **Submit settlements** (`src/blockchain/settlement.ts`)
```typescript
const settlementManager = new SettlementManager({
  rpcUrl,
  privateKey,
  settlementAddress,
  partyAddresses,
  chainId
});

await settlementManager.submitSettlement(
  intentId,
  allocations,
  signatures
);
```

## Event Schema

### IntentCreated
```solidity
event IntentCreated(
    bytes32 indexed intentId,
    address indexed user,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
)
```

### IntentFilled
```solidity
event IntentFilled(
    bytes32 indexed intentId,
    uint256 totalAmountOut,
    uint256 numNodes
)
```

### IntentCancelled
```solidity
event IntentCancelled(
    bytes32 indexed intentId,
    address indexed user
)
```

## Flow Diagram

```
User (UI)
  ↓ createIntent()
  ↓ [Deposit tokenIn]
Settlement Contract
  ↓ emit IntentCreated
  ↓
MPC Nodes (listening)
  ↓ [Off-chain MPC computation]
  ↓ [Calculate allocations]
  ↓ batchFillIntent()
  ↓
Settlement Contract
  ↓ [Transfer tokenIn to nodes proportionally]
  ↓ [Transfer tokenOut from nodes to user]
  ↓ emit IntentFilled
  ↓
User receives tokenOut
```

## Testing

Run the comprehensive test suite:

```bash
cd contracts
forge test --match-contract SettlementTest --offline
```

All 26 tests pass including:
- Intent creation and validation
- Batch filling with multiple nodes
- Proportional allocation calculations
- Cancellation and refunds
- Access control
- Edge cases and error conditions
- Fuzz testing

## Security Features

1. **ReentrancyGuard**: Protection against reentrancy attacks
2. **SafeERC20**: Safe token transfers
3. **Access Control**: Owner-only admin functions
4. **Input Validation**: Comprehensive parameter validation
5. **Status Checks**: Intents can only be filled/cancelled once
6. **Deadline Enforcement**: Intents expire after deadline
7. **Minimum Nodes**: Ensures sufficient decentralization

## Gas Optimization

- Efficient storage patterns
- Batch operations to minimize transactions
- Single storage update patterns
- Events for off-chain indexing

## Deployment Script

```bash
export PRIVATE_KEY=<your_private_key>
export BASE_SEPOLIA_RPC_URL=<your_rpc_url>
cd contracts
forge script script/DeploySettlement.s.sol:DeploySettlement \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast
```

## License

MIT
