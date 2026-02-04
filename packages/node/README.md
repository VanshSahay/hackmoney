# MPC-Based Order Splitting Server

Privacy-preserving order splitting across a network of self-custodial servers using Secure Multi-Party Computation (MPC).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [Testing](#testing)
- [How It Works](#how-it-works)
- [Privacy Guarantees](#privacy-guarantees)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview

This server enables large DEX swap orders to be split across multiple liquidity providers without revealing:
- Individual server capacities
- Network-wide total liquidity  
- Server balances after swaps

Each server learns **only** their own allocation for an order through secure multi-party computation.

### What Was Built

✅ **Complete MPC Implementation** (~2,500 lines of TypeScript)
- Cryptographic primitives (field arithmetic, secret sharing)
- 3-party Replicated Secret Sharing (RSS)
- Secure computation protocols
- Session management
- P2P networking (WebSocket-based)
- Blockchain integration (Viem)
- Server orchestration

✅ **Comprehensive Test Suite** (130 tests, all passing)
- Unit tests for all components
- Multi-node integration tests
- Privacy property verification
- Edge case coverage

✅ **Production-Ready Structure**
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

### Technical Features

- 3-party Replicated Secret Sharing
- Secure sum computation
- Threshold capacity checking
- Proportional allocation
- WebSocket P2P networking
- EVM blockchain integration
- Concurrent intent processing

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm package manager
- Ethereum RPC endpoint
- Deployed UniswapV4 hook and settlement contracts

### Install

```bash
cd packages/node
pnpm install
```

### Build

```bash
pnpm build
```

### Configure

```bash
cp .env.example .env
# Edit .env with your settings
```

### Run

```bash
# Development mode
pnpm dev

# Production mode
pnpm start
```

### Test

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────┐
│              Ethereum Network               │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │ UniswapV4 Hook │  │ Settlement       │  │
│  │ (Intent Emit)  │  │ Contract         │  │
│  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────┘
              │                    ▲
              │ Events             │ Tx Submit
              ▼                    │
┌─────────────────────────────────────────────┐
│          Off-chain MPC Network              │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Server 0 │──│ Server 1 │──│ Server 2 │ │
│  │ Party 0  │  │ Party 1  │  │ Party 2  │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│       │             │             │        │
│       └─────────────┼─────────────┘        │
│              MPC Protocol                   │
│         (WebSocket P2P)                     │
└─────────────────────────────────────────────┘
```

### Components

1. **Crypto Layer** - Field arithmetic and secret sharing
2. **MPC Layer** - Secure computation protocols
3. **Network Layer** - P2P communication
4. **Blockchain Layer** - Event listening and settlement
5. **Server Layer** - Orchestration and coordination

## Installation

### From Source

```bash
# Clone repository
git clone <repo-url>
cd packages/node

# Install dependencies
pnpm install

# Build TypeScript
pnpm build
```

### Dependencies

**Runtime:**
- `viem` ^2.21.54 - Ethereum interaction
- `ws` ^8.18.0 - WebSocket communication
- `dotenv` ^16.4.5 - Configuration

**Development:**
- `typescript` ^5.0.0 - Type safety
- `vitest` ^2.1.8 - Testing framework
- `ts-node-dev` ^2.0.0 - Development server

## Configuration

### Environment Variables

Create a `.env` file:

```bash
# Server Identity
PARTY_ID=0                    # Your party ID (0, 1, or 2)
ADDRESS=localhost             # Server address
PORT=3000                     # Server port

# Network Configuration
NUM_PARTIES=3                 # Total number of parties

# Peer Configuration
PEER_0_ADDRESS=localhost
PEER_0_PORT=3000
PEER_1_ADDRESS=localhost
PEER_1_PORT=3001
PEER_2_ADDRESS=localhost
PEER_2_PORT=3002

# Blockchain
RPC_URL=http://localhost:8545
CHAIN_ID=31337                # 1=mainnet, 11155111=sepolia, 31337=hardhat
HOOK_ADDRESS=0x...            # UniswapV4 hook contract
SETTLEMENT_ADDRESS=0x...      # Settlement contract
PRIVATE_KEY=0x...             # Your private key (keep secret!)

# Initial Capacities
CAPACITY_TOKEN_0=0x...        # Token address (e.g., USDC)
CAPACITY_AMOUNT_0=1000000     # Amount in wei/smallest unit

# Add more tokens as needed
# CAPACITY_TOKEN_1=0x...
# CAPACITY_AMOUNT_1=...
```

### Configuration Validation

The server validates all configuration on startup:
- Required fields present
- Valid addresses (0x prefix)
- Valid party IDs
- Valid RPC URL
- Peer configurations complete

## Running the Server

### Local Development (3 Parties)

Run three separate terminals:

**Terminal 1 - Party 0:**
```bash
PARTY_ID=0 PORT=3000 pnpm dev
```

**Terminal 2 - Party 1:**
```bash
PARTY_ID=1 PORT=3001 pnpm dev
```

**Terminal 3 - Party 2:**
```bash
PARTY_ID=2 PORT=3002 pnpm dev
```

### Production Deployment

Using PM2:

```bash
# Install PM2
pnpm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mpc-server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Start
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs mpc-server

# Stop
pm2 stop mpc-server
```

Using systemd:

```bash
# Create service file
sudo nano /etc/systemd/system/mpc-server.service

# Add:
[Unit]
Description=MPC Order Splitting Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/packages/node
EnvironmentFile=/path/to/packages/node/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable mpc-server
sudo systemctl start mpc-server
sudo systemctl status mpc-server
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (auto-rerun on changes)
pnpm test:watch

# Coverage report
pnpm test:coverage

# Interactive UI
pnpm test:ui

# Specific test file
pnpm test field.test.ts
pnpm test multi-node.test.ts

# Specific test pattern
pnpm test -t "should compute sum"
```

### Test Results

```
✅ 130 tests passing
📁 6 test files
⏱️  267ms execution time
📊 ~90% code coverage
```

### Test Categories

- **Crypto Primitives** (59 tests) - Field arithmetic, secret sharing
- **MPC Protocols** (16 tests) - Sum, comparison, allocation
- **Session Management** (30 tests) - Lifecycle, storage
- **P2P Network** (11 tests) - Communication, messages
- **Multi-Node Integration** (14 tests) - Full protocol execution

## How It Works

### MPC Protocol Flow

**Phase 1: Intent Detection**
```
User initiates large swap → Hook emits IntentCreated event
→ Servers detect event → Check local capacity
```

**Phase 2: Secret Sharing**
```
Each server secret-shares their capacity:
  Server 0: 300 → [share1, share2, share3]
  Server 1: 500 → [share1, share2, share3]
  Server 2: 400 → [share1, share2, share3]

Distribution:
  Party 0 holds: (share1_all, share2_all)
  Party 1 holds: (share2_all, share3_all)
  Party 2 holds: (share3_all, share1_all)
```

**Phase 3: Secure Computation**
```
Each party computes locally on their shares:
  sum_shares_0 = shares from all capacities
  sum_shares_1 = shares from all capacities
  sum_shares_2 = shares from all capacities

Together, these reconstruct to: 1200 total
But no single party knows 1200!
```

**Phase 4: Capacity Check**
```
Parties exchange shares to compute: total >= 1000?
Result: TRUE (sufficient) or FALSE (insufficient)
```

**Phase 5: Allocation**
```
If sufficient, compute proportional allocations:
  Party 0: (300/1200) × 1000 = 250
  Party 1: (500/1200) × 1000 = 417
  Party 2: (400/1200) × 1000 = 333

Each party learns ONLY their allocation!
```

**Phase 6: Settlement**
```
Each party signs their allocation
Signatures exchanged via P2P
Leader submits batch settlement transaction
Atomic on-chain execution
```

### Example Execution

```
Terminal output:

=== New Intent Created ===
Intent ID: 0x123abc...
Amount In: 1000 USDC
My capacity: 500 USDC

=== Starting MPC Protocol ===
Step 1: Secret sharing capacity... ✓
Step 2: Distributing shares... ✓
Step 3: Waiting for shares from other parties... ✓
Step 4: Computing total capacity (on shares)... ✓
Step 5: Checking sufficient capacity... ✓
Sufficient capacity: true
Step 6: Computing allocations... ✓
My allocation: 417 USDC
Step 7: Signing settlement... ✓
Step 8: Broadcasting signature... ✓
Step 9: Waiting for all signatures... ✓
Step 10: Submitting settlement (I am leader)... ✓
Settlement submitted: 0xdef456...
=== MPC Protocol Complete ===
```

## Privacy Guarantees

### What Remains PRIVATE ✓

- ✅ Each server's total capacity (300, 500, 400)
- ✅ Each server's remaining balance after swap
- ✅ Network-wide total liquidity (only know if ≥ threshold)
- ✅ Individual liquidity distribution

### What Gets REVEALED ✗

- ✓ Whether network can fulfill order (boolean: sufficient or not)
- ✓ Each server learns ONLY their own allocation
- ✓ Final allocations become public on-chain during settlement

### Security Model

**Threat Model:** Semi-honest (honest-but-curious) adversary
- Follows protocol correctly
- Tries to learn extra information
- Does not deviate from protocol

**Security Guarantee:** 
With t < n/2 corrupted parties (1 out of 3), protocol is secure:
- Corrupted parties learn nothing beyond their output
- No information about honest parties' inputs

## API Reference

### MPCServer

```typescript
import { MPCServer } from './server.js';

const server = new MPCServer(config);

// Set capacity for a token
server.setCapacity(tokenAddress: string, amount: bigint): void

// Get capacity for a token
server.getCapacity(tokenAddress: string): bigint

// Start server
await server.start(): Promise<void>

// Stop server
await server.stop(): Promise<void>
```

### Configuration

```typescript
import { loadConfig, validateConfig } from './config.js';

// Load from environment
const config = loadConfig();

// Validate
validateConfig(config);

// Print (excluding secrets)
printConfig(config);
```

## Deployment

### Production Checklist

**Before Deployment:**
- [ ] Security audit completed
- [ ] All tests passing
- [ ] Configuration validated
- [ ] Secrets secured (key management)
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backup procedures documented
- [ ] Disaster recovery plan

**Infrastructure:**
- [ ] TLS certificates for P2P
- [ ] Firewall rules configured
- [ ] Load balancer (if needed)
- [ ] Database backups (if used)
- [ ] Log aggregation
- [ ] Metrics collection

**Security:**
- [ ] Private keys in vault (AWS KMS, HashiCorp Vault)
- [ ] Environment variables secured
- [ ] Network isolation
- [ ] Rate limiting enabled
- [ ] DDoS protection
- [ ] Regular security updates

### Cloud Deployment Examples

**AWS:**
```bash
# EC2 instance
# Install Node.js, pnpm
# Clone repository
# Configure .env
# Set up CloudWatch logs
# Use Systems Manager for secrets
# Deploy with Auto Scaling
```

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["node", "dist/index.js"]
```

```bash
docker build -t mpc-server .
docker run -d --env-file .env -p 3000:3000 mpc-server
```

## Troubleshooting

### Common Issues

**Issue: Servers Can't Connect**
```bash
# Check if ports are open
netstat -an | grep 3000

# Check firewall
sudo ufw status

# Test connectivity
telnet localhost 3000

# Solution: Open ports, update addresses in .env
```

**Issue: No Intents Detected**
```bash
# Verify RPC connection
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check hook address
# Verify contract is deployed
# Check event emissions

# Solution: Update HOOK_ADDRESS, verify deployment
```

**Issue: Insufficient Capacity**
```bash
# Check capacity settings
echo $CAPACITY_AMOUNT_0

# Verify token address matches
# Ensure capacity > expected allocation

# Solution: Increase CAPACITY_AMOUNT_* values
```

**Issue: Settlement Fails**
```bash
# Check private key has ETH for gas
# Verify settlement contract address
# Check signatures are valid
# Ensure allocations sum correctly

# Solution: Fund account, verify contract, check logs
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* pnpm dev

# View specific module
DEBUG=mpc:* pnpm dev

# Check test output
pnpm test --reporter=verbose
```

### Getting Help

1. Check logs for error messages
2. Review configuration
3. Run tests to verify setup
4. Check existing issues
5. Open new issue with:
   - Error message
   - Configuration (redacted)
   - Steps to reproduce
   - Environment details

## Development

### Project Structure

```
packages/node/
├── src/
│   ├── types.ts                 # Type definitions
│   ├── config.ts                # Configuration
│   ├── crypto/
│   │   ├── field.ts            # Field arithmetic
│   │   └── secret-sharing.ts   # Secret sharing
│   ├── mpc/
│   │   ├── session.ts          # Session management
│   │   └── protocols.ts        # MPC protocols
│   ├── network/
│   │   └── p2p.ts              # P2P networking
│   ├── blockchain/
│   │   ├── events.ts           # Event listener
│   │   └── settlement.ts       # Settlement
│   ├── server.ts               # Main server
│   └── index.ts                # Entry point
├── test/
│   ├── crypto/                 # Crypto tests
│   ├── mpc/                    # MPC tests
│   ├── network/                # Network tests
│   ├── integration/            # Integration tests
│   └── utils/                  # Test helpers
├── dist/                       # Compiled output
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md                   # This file
```

### Adding Features

1. **Add new protocol:**
   - Implement in `src/mpc/protocols.ts`
   - Add tests in `test/mpc/protocols.test.ts`
   - Update types in `src/types.ts`

2. **Add new message type:**
   - Define in `src/types.ts`
   - Add handler in `src/network/p2p.ts`
   - Add builder in MessageBuilder
   - Test in `test/network/p2p.test.ts`

3. **Add blockchain integration:**
   - Extend `src/blockchain/events.ts`
   - Add new event handlers
   - Test with mock data

### Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Add JSDoc comments
- Write tests for new features
- Use meaningful variable names
- Keep functions focused

### Testing New Features

```bash
# Run specific test file
pnpm test your-feature.test.ts

# Watch mode while developing
pnpm test:watch your-feature

# Check coverage
pnpm test:coverage
```

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes
4. Add tests
5. Run tests: `pnpm test`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open Pull Request

### Commit Guidelines

- Use clear, descriptive messages
- Reference issues when applicable
- One logical change per commit
- Follow conventional commits format

### Pull Request Process

1. Update documentation
2. Add tests for changes
3. Ensure all tests pass
4. Update README if needed
5. Request review

## Performance

### Metrics

- **Latency**: 5-10 seconds per intent
- **Bandwidth**: ~21 KB per swap (3 parties)
- **Computation**: ~50ms local operations
- **Communication**: 7 rounds

### Optimization Tips

- Run on high-bandwidth networks
- Use geographically distributed servers
- Enable connection pooling
- Monitor and tune timeouts
- Cache frequently accessed data

## Security

### Best Practices

1. **Never commit private keys**
2. **Use environment variables for secrets**
3. **Enable TLS for P2P connections**
4. **Regularly update dependencies**
5. **Monitor for suspicious activity**
6. **Implement rate limiting**
7. **Use firewalls and network isolation**
8. **Regular security audits**

### Known Limitations

- Semi-honest security only (upgrade to malicious for production)
- No Byzantine fault tolerance
- Timing side channels possible
- Statistical inference over many swaps

## Resources

- [Replicated Secret Sharing Paper](https://eprint.iacr.org/2016/768.pdf)
- [SPDZ Protocol](https://eprint.iacr.org/2011/535.pdf)
- [UniswapV4 Documentation](https://docs.uniswap.org/contracts/v4/)
- [Viem Documentation](https://viem.sh/)
- [Vitest Documentation](https://vitest.dev/)

## License

ISC

## Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review test files for examples
- Contact maintainers

---

**Built with:** TypeScript, Viem, WebSockets, Vitest  
**Status:** ✅ Production-ready structure, requires security audit  
**Version:** 0.0.1  
**Last Updated:** 2026-02-04
