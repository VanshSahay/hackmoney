# Settlement Contract

Privacy-preserving intent settlement for MPC-based order splitting system.

## Overview

The Settlement contract manages the creation and fulfillment of swap intents in a privacy-preserving manner. It works in conjunction with MPC nodes that compute allocations off-chain without revealing individual capacities.

## Features

- **Intent Management**: Create, fill, and cancel swap intents
- **Node Registration**: Whitelist trusted MPC nodes
- **Batch Settlement**: Multiple nodes fulfill intents proportionally
- **Token Safety**: SafeERC20 for secure token transfers
- **Reentrancy Protection**: Protected against reentrancy attacks

## Contract Architecture

```solidity
contract Settlement {
    struct Intent {
        bytes32 intentId;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        IntentStatus status;
        uint256 createdAt;
    }
    
    enum IntentStatus { Pending, Filled, Cancelled }
}
```

## Key Functions

### createIntent
```solidity
function createIntent(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
) external returns (bytes32 intentId)
```
Creates a new swap intent. User's `tokenIn` is transferred to the contract.

### batchFillIntent
```solidity
function batchFillIntent(
    bytes32 intentId,
    address[] calldata nodes,
    uint256[] calldata amounts,
    bytes[] calldata signatures
) external
```
Fills an intent with contributions from multiple MPC nodes. Each node:
1. Receives proportional `tokenIn` based on their output contribution
2. Transfers `tokenOut` to the user

### cancelIntent
```solidity
function cancelIntent(bytes32 intentId) external
```
Cancels a pending intent and refunds `tokenIn` to the user.

### Node Management
```solidity
function registerNode(address node) external onlyOwner
function unregisterNode(address node) external onlyOwner
```

## Events

```solidity
event IntentCreated(
    bytes32 indexed intentId,
    address indexed user,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 deadline
);

event IntentFilled(
    bytes32 indexed intentId,
    uint256 totalAmountOut,
    uint256 numNodes
);

event NodeRegistered(address indexed node);
event NodeUnregistered(address indexed node);
```

## Usage with Foundry

### Build
```shell
forge build
```

### Test
```shell
forge test
```

### Deploy
```shell
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url <RPC_URL> \
  --private-key <PRIVATE_KEY> \
  --broadcast
```

### Register Nodes
```shell
cast send $SETTLEMENT_ADDRESS \
  "registerNode(address)" \
  $NODE_ADDRESS \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL
```

## Integration with MPC Nodes

1. **Intent Detection**: Nodes listen for `IntentCreated` events
2. **MPC Computation**: Nodes compute allocations privately using secret sharing
3. **Settlement**: Leader node calls `batchFillIntent` with all signatures
4. **Token Distribution**: Contract distributes tokens atomically

## Security Considerations

- **Node Registration**: Only registered nodes can participate in settlements
- **Deadline Enforcement**: Intents expire after deadline
- **Minimum Output**: Ensures user receives at least `minAmountOut`
- **Signature Validation**: Future: Verify node signatures for additional security
- **Proportional Allocation**: Input tokens distributed based on output contribution

## Testing

```shell
forge test -vvv
```

Test coverage includes:
- Intent creation and cancellation
- Batch filling with multiple nodes
- Proportional allocation calculations
- Node registration/unregistration
- Edge cases (expired intents, insufficient output, etc.)

## Gas Optimization

- Uses `calldata` for array parameters
- Efficient storage layout
- Batch operations to reduce transaction count
- SafeERC20 for gas-efficient transfers

## License

MIT
