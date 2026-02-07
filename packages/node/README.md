# VeilSwap Node

Privacy-preserving order splitting across a network of self-custodial servers using Secure Multi-Party Computation (MPC) with automatic token swapping via Uniswap v4.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Settlement Contract Integration](#settlement-contract-integration)
- [Uniswap Auto-Swap](#uniswap-auto-swap)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Privacy Guarantees](#privacy-guarantees)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

This server enables large DEX swap orders to be split across multiple liquidity providers without revealing:
- Individual server capacities
- Network-wide total liquidity  
- Server balances after swaps

Each server learns **only** their own allocation for an order through secure multi-party computation.

### What Was Built

✅ **Complete MPC Implementation** (~3,000 lines of TypeScript)
- Cryptographic primitives (field arithmetic, secret sharing)
- 3-party Replicated Secret Sharing (RSS)
- Secure computation protocols
- Session management
- P2P networking (WebSocket-based)
- Blockchain integration (Viem)
- Uniswap v4 integration for automatic token swapping
- Server orchestration

✅ **Comprehensive Test Suite**
- Unit tests for all components
- Multi-node integration tests
- Privacy property verification
- Uniswap v4 and inventory management tests
- Edge case coverage

✅ **Production-Ready Structure**
- Auto-generated wallets with ENS support
- Configuration management
- Error handling
- Logging and monitoring hooks
- Documentation

## Features

### Core Capabilities

- **Privacy-Preserving**: Individual capacities never revealed
- **Decentralized**: No trusted third party required
- **Secure**: Cryptographic guarantees (semi-honest model)
- **Efficient**: ~5-10 seconds per intent, minimal bandwidth
- **Scalable**: Handles concurrent intents
- **Fault-Tolerant**: Detects and handles failures
- **Flexible**: Nodes can hold any token, auto-swaps via Uniswap
- **Simple Configuration**: Minimal setup with ENS names

### Technical Features

- 3-party Replicated Secret Sharing
- Secure sum computation
- Threshold capacity checking
- Proportional allocation
- WebSocket P2P networking
- Settlement contract integration
- Automatic wallet generation
- Uniswap v4 token swapping
- Token inventory management
- Multi-chain support (Mainnet, Base, Sepolia, etc.)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm package manager
- Ethereum RPC endpoint
- Deployed Settlement contract

### Install

```bash
cd packages/node
pnpm install
pnpm build
```

### Configure

```bash
cp .env.example .env
```

**Minimal Configuration:**
```env
NODE_NAME=alice.eth
PEERS=bob.eth,charlie.eth
RPC_URL=http://localhost:8545
CHAIN_ID=31337
SETTLEMENT_ADDRESS=0x...
```

That's it! The node will:
- ✅ Auto-generate a wallet (or use existing)
- ✅ Auto-assign party IDs based on sorted node names
- ✅ Auto-assign network ports
- ✅ Display wallet address and public key on startup
- ✅ Enable auto-swap via Uniswap (default)

### Run

```bash
# Development mode
pnpm dev

# Production mode
pnpm start

# Local 3-node network
pnpm network:start
```

### Test

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage
```

## Settlement Contract Integration

### Overview

Nodes now work directly with the `Settlement.sol` contract for:
- Intent creation and detection
- Node registration management
- Batch settlement with multiple parties

### Key Changes

1. **Event Listening**: Listen to `IntentCreated` events from Settlement contract
2. **Node Registration**: Must be registered to participate in settlements
3. **Simplified Config**: No more `HOOK_ADDRESS`, only `SETTLEMENT_ADDRESS`
4. **Token Approvals**: Automatic approval of tokenOut before settlement

### Node Registration

Nodes must be registered by the contract owner:

```bash
# Using cast (Foundry)
cast send $SETTLEMENT_ADDRESS \
  "registerNode(address)" \
  $NODE_ADDRESS \
  --private-key $OWNER_KEY \
  --rpc-url $RPC_URL
```

On startup, nodes check registration status and display warnings if not registered.

### Settlement Flow

1. **Listen**: IntentCreated event from Settlement contract
2. **Check**: Node is registered
3. **Capacity**: Check if node has required tokenIn
4. **Auto-Swap** (if enabled): Swap from available tokens
5. **MPC Protocol**: Compute allocations privately
6. **Approve**: tokenOut for Settlement contract
7. **Submit**: batchFillIntent with all signatures

## Uniswap Auto-Swap

### Overview

Nodes can hold **any token** and automatically swap to fulfill intent requirements using Uniswap v4 (Universal Router + Permit2).

### How It Works

```
1. Intent Created: User wants to swap 100 USDC → ETH
2. Node Check: "Do I have USDC?"
3. Auto-Swap: 
   - Node has 200 DAI
   - Calculates swap: 100 DAI → 100 USDC
   - Executes Uniswap v4 swap
   - Updates capacity
4. MPC Protocol: Participate with USDC
5. Settlement: Receive proportional ETH
```

### Example Flow

```
Intent: User wants 100 USDC for ETH
Node 1: Has 200 DAI → Swaps 100 DAI → 100 USDC
Node 2: Has 150 USDC → Uses USDC directly
Node 3: Has 50 USDC → Uses USDC directly

Total: 300 USDC capacity (sufficient)
Settlement: Each node receives proportional ETH
```

### Supported Chains

- **Mainnet** (1)
- **Sepolia** (11155111)
- **Base** (8453)
- **Base Sepolia** (84532)
- **Hardhat/Anvil** (31337)

### Configuration

```env
# Enable/disable auto-swap (default: true)
ENABLE_AUTO_SWAP=true
```

### Fee Tiers

- **0.05%** (500): Stablecoin pairs
- **0.3%** (3000): Standard pairs (default)
- **1%** (10000): Exotic pairs

### Slippage

Default: **5%** (500 basis points)

```
maxInput = targetOutput * (1 + slippage) / (1 - fee)
minOutput = targetOutput * (1 - slippage)
```

### Advantages

1. **Flexibility**: Hold any liquid token
2. **Capital Efficiency**: Use all available capital
3. **Simplified Operations**: No manual token management
4. **Privacy Preserved**: Swaps happen before MPC

### Limitations

1. **Gas Costs**: Additional swap transaction
2. **Slippage Risk**: 5% default may not suit all pairs
3. **Liquidity**: Requires Uniswap v4 liquidity
4. **Latency**: Adds 10-30 seconds
5. **MEV Exposure**: Swap visible on-chain

## Configuration

### Environment Variables

```env
# ====== REQUIRED ======

# Node Identity (ENS name or identifier)
NODE_NAME=alice.eth

# Peer Discovery (comma-separated ENS names)
PEERS=bob.eth,charlie.eth

# Blockchain Configuration
RPC_URL=http://localhost:8545
CHAIN_ID=31337
SETTLEMENT_ADDRESS=0x...

# ====== OPTIONAL ======

# Network Port (auto-generated if not set)
PORT=auto

# Wallet (auto-generated and saved if not set)
PRIVATE_KEY=0x...

# Uniswap Auto-Swap (default: true)
ENABLE_AUTO_SWAP=true

# Uniswap v4 pool params (optional overrides)
# UNISWAP_V4_FEE=3000
# UNISWAP_V4_TICK_SPACING=60
# UNISWAP_V4_HOOKS=0x0000000000000000000000000000000000000000

# Initial Token Capacities
CAPACITY_TOKEN_0=0x...
CAPACITY_AMOUNT_0=1000000
```

### What's Auto-Generated

1. **Party ID**: Based on alphabetically sorted node names
   - Example: alice.eth=0, bob.eth=1, charlie.eth=2

2. **Network Port**: Deterministically from node name hash
   - Same name always gets same port (3000-3999)

3. **Wallet**: Saved to `~/.mpc-node/wallets/`
   - Persisted across restarts
   - Displayed on startup

## Running the Server

### Local Development (3 Nodes)

**Option 1: Scripts**
```bash
pnpm network:start   # Start all 3 nodes
pnpm network:stop    # Stop all nodes
```

**Option 2: Manual (3 terminals)**
```bash
# Terminal 1
NODE_NAME=alice.eth PEERS=bob.eth,charlie.eth pnpm dev

# Terminal 2
NODE_NAME=bob.eth PEERS=alice.eth,charlie.eth pnpm dev

# Terminal 3
NODE_NAME=charlie.eth PEERS=alice.eth,bob.eth pnpm dev
```

### Production Deployment

**Using PM2:**
```bash
pm2 start dist/index.js --name mpc-node
pm2 monit
pm2 logs mpc-node
```

**Using systemd:**
```ini
[Unit]
Description=MPC Order Splitting Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/packages/node
EnvironmentFile=/path/to/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## Testing

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
pnpm test:ui           # Interactive UI
```

### Test Categories

- **Crypto Primitives** (59 tests): Field arithmetic, secret sharing
- **MPC Protocols** (16 tests): Sum, comparison, allocation
- **Session Management** (30 tests): Lifecycle, storage
- **P2P Network** (11 tests): Communication, messages
- **Multi-Node Integration** (14 tests): Full protocol
- **Uniswap Integration**: Swap calculations, config
- **Inventory Management** (25 tests): Balance tracking, swapping
- **Settlement Integration** (15 tests): Contract logic

## Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│            Settlement Contract              │
│  (IntentCreated, batchFillIntent)           │
└─────────────────────────────────────────────┘
              │                    ▲
              │ Events             │ Settlement
              ▼                    │
┌─────────────────────────────────────────────┐
│          Off-chain MPC Network              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Node 1   │──│ Node 2   │──│ Node 3   │ │
│  │ (alice)  │  │ (bob)    │  │ (charlie)│ │
│  └──────────┘  └──────────┘  └──────────┘ │
│       │             │             │        │
│       └─────────────┼─────────────┘        │
│              MPC Protocol                   │
│         (WebSocket P2P)                     │
└─────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│     Uniswap v4 Universal Router             │
│        (Token Swapping)                     │
└─────────────────────────────────────────────┘
```

### Components

1. **Crypto Layer**: Field arithmetic and secret sharing
2. **MPC Layer**: Secure computation protocols
3. **Network Layer**: P2P communication (WebSocket)
4. **Blockchain Layer**: Event listening and settlement
5. **DeFi Layer**: Uniswap integration and inventory
6. **Server Layer**: Orchestration and coordination

### File Structure

```
packages/node/
├── src/
│   ├── types.ts              # Type definitions
│   ├── config.ts             # Configuration management
│   ├── index.ts              # Entry point
│   ├── server.ts             # Main MPC server
│   ├── crypto/
│   │   ├── field.ts         # Field arithmetic
│   │   └── secret-sharing.ts # Secret sharing
│   ├── mpc/
│   │   ├── session.ts       # Session management
│   │   └── protocols.ts     # MPC protocols
│   ├── network/
│   │   └── p2p.ts           # P2P networking
│   ├── blockchain/
│   │   ├── events.ts        # Event listener
│   │   └── settlement.ts    # Settlement manager
│   ├── defi/
│   │   ├── uniswap_v4.ts    # Uniswap v4 integration
│   │   └── inventory.ts     # Token inventory
│   └── utils/
│       ├── wallet.ts        # Wallet management
│       └── ens.ts           # ENS utilities
├── test/                    # Test files
├── scripts/                 # Helper scripts
└── dist/                    # Compiled output
```

## How It Works

### MPC Protocol Flow

**Phase 1: Intent Detection**
```
User creates swap → Settlement emits IntentCreated
→ Nodes detect event → Check capacity/swap if needed
```

**Phase 2: Secret Sharing**
```
Each node secret-shares their capacity:
  Node 1: 300 → [share1, share2, share3]
  Node 2: 500 → [share1, share2, share3]
  Node 3: 400 → [share1, share2, share3]

Distribution (Replicated SS):
  Party 0 holds: (share1_all, share2_all)
  Party 1 holds: (share2_all, share3_all)
  Party 2 holds: (share3_all, share1_all)
```

**Phase 3: Secure Computation**
```
Each party computes locally on shares:
  sum_shares = shares from all capacities
Together reconstruct to: 1200 total
But no single party knows 1200!
```

**Phase 4: Capacity Check**
```
Parties exchange shares to compute: total >= threshold?
Result: TRUE (sufficient) or FALSE (insufficient)
```

**Phase 5: Allocation**
```
Compute proportional allocations:
  Node 1: (300/1200) × 1000 = 250
  Node 2: (500/1200) × 1000 = 417
  Node 3: (400/1200) × 1000 = 333
Each learns ONLY their allocation!
```

**Phase 6: Settlement**
```
Each node:
1. Signs their allocation
2. Exchanges signatures via P2P
3. Leader submits batchFillIntent
4. Atomic on-chain execution
```

## Privacy Guarantees

### What Remains PRIVATE ✓

- ✅ Each server's total capacity
- ✅ Each server's remaining balance after swap
- ✅ Network-wide total liquidity (only know if ≥ threshold)
- ✅ Individual liquidity distribution
- ✅ Which tokens nodes swapped from (happens before MPC)

### What Gets REVEALED ✗

- ✓ Whether network can fulfill order (boolean)
- ✓ Each server learns ONLY their own allocation
- ✓ Final allocations become public on-chain

### Security Model

**Threat Model:** Semi-honest (honest-but-curious)
- Follows protocol correctly
- Tries to learn extra information
- Does not deviate from protocol

**Security Guarantee:** With t < n/2 corrupted parties (1 out of 3):
- Corrupted parties learn nothing beyond their output
- No information about honest parties' inputs

## Deployment

### Production Checklist

**Before Deployment:**
- [ ] Security audit completed
- [ ] All tests passing (185/185)
- [ ] Configuration validated
- [ ] Secrets secured (key management)
- [ ] Monitoring configured
- [ ] Node registered with Settlement contract
- [ ] Funded with liquid tokens (for swapping)

**Infrastructure:**
- [ ] TLS certificates for P2P
- [ ] Firewall rules configured
- [ ] Uniswap liquidity verified
- [ ] Log aggregation
- [ ] Metrics collection

**Security:**
- [ ] Private keys in vault (KMS, Vault)
- [ ] Environment variables secured
- [ ] Network isolation
- [ ] Rate limiting enabled
- [ ] MEV protection (private RPC)

### Monitoring

Key metrics to monitor:
- Intent processing success rate
- Swap success rate and gas costs
- Slippage experienced
- MPC protocol latency
- P2P connection health
- Token balance levels

## Troubleshooting

### Common Issues

**Node not registered:**
```bash
# Check registration
cast call $SETTLEMENT_ADDRESS \
  "isNodeRegistered(address)" \
  $NODE_ADDRESS \
  --rpc-url $RPC_URL

# Register node (as owner)
cast send $SETTLEMENT_ADDRESS \
  "registerNode(address)" \
  $NODE_ADDRESS \
  --private-key $OWNER_KEY
```

**Swap fails:**
- Check Uniswap liquidity for pair
- Verify token balances
- Adjust slippage tolerance
- Check gas price

**Nodes can't connect:**
- Verify all nodes use same peer names
- Check firewall rules
- Ensure ports are open
- Verify network addresses

**Insufficient capacity:**
- Fund nodes with liquid tokens
- Enable auto-swap
- Check token balances

## Resources

- [Replicated Secret Sharing Paper](https://eprint.iacr.org/2016/768.pdf)
- [Uniswap v4 Documentation](https://docs.uniswap.org/contracts/v4/)
- [Viem Documentation](https://viem.sh/)
- [Vitest Documentation](https://vitest.dev/)

## License

ISC
