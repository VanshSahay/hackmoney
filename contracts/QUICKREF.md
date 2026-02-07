# Settlement Contract - Quick Reference

## 🚀 Deployment Info

| Property | Value |
|----------|-------|
| **Network** | Base Sepolia |
| **Chain ID** | 84532 |
| **Contract Address** | `0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4` |
| **Owner Address** | `0x89fEdB2167197199Fd069122e5351A1C779F91B8` |
| **Block Number** | 37384688 (0x23991f0) |
| **Transaction Hash** | `0x87db59fed1708e7d92ed06899c312cd655080f61e58669099148e5fa9ea0148e` |
| **Min Nodes Required** | 2 |
| **Deployment Gas** | 2,988,123 gas |

## 📝 Key Functions

### For Users (UI)
```solidity
// Create a swap intent
createIntent(tokenIn, tokenOut, amountIn, minAmountOut, deadline) → intentId

// Cancel an intent
cancelIntent(intentId)
```

### For Nodes (Backend)
```solidity
// Submit settlement
batchFillIntent(intentId, nodes[], amounts[], signatures[])
```

### For Admin (Owner)
```solidity
// Register/unregister nodes
registerNode(nodeAddress)
unregisterNode(nodeAddress)
```

## 🔗 Quick Links

- **Explorer**: https://sepolia.basescan.org/address/0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4
- **RPC URL**: https://base-sepolia.g.alchemy.com/v2/wfTWOqX-tfO2ahOiD3rCXzscObxKVms-

## 📚 Documentation Files

1. **`DEPLOYMENT_SUMMARY.md`** - Overview of what was built
2. **`contracts/SETTLEMENT.md`** - Contract documentation & API
3. **`INTEGRATION.md`** - Complete integration guide
4. **`contracts/src/Settlement.sol`** - Smart contract source
5. **`contracts/test/Settlement.t.sol`** - Test suite (26 tests ✅)
6. **`apps/web/config/settlement.ts`** - UI integration hooks

## 🧪 Testing

```bash
cd contracts
forge test --match-contract SettlementTest --offline
# Result: All 26 tests passed ✅
```

## 🎯 Next Steps

1. **Register Nodes**: Call `registerNode()` for each MPC node
2. **Start Nodes**: Configure `.env` and run `pnpm dev` in `packages/node`
3. **Integrate UI**: Import hooks from `config/settlement.ts`
4. **Test Flow**: Create intent → Nodes process → Settlement executed

## 📊 Events to Listen For

```solidity
// User creates intent
IntentCreated(intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, deadline)

// Nodes fill intent
IntentFilled(intentId, totalAmountOut, numNodes)

// User cancels intent
IntentCancelled(intentId, user)
```

## 💡 Example Usage

### UI Side
```typescript
import { useCreateIntent } from '@/config/settlement';

const { createIntent } = useCreateIntent();
await createIntent({
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: '100',
  minAmountOut: '95',
  deadline: Date.now()/1000 + 3600
});
```

### Node Side
```typescript
// Already configured in packages/node/src/blockchain/events.ts
listener.onIntentCreated(async (event) => {
  // MPC computation happens here
  // Settlement submitted automatically
});
```

## 🔐 Security

- ✅ ReentrancyGuard
- ✅ SafeERC20
- ✅ Ownable access control
- ✅ Input validation
- ✅ Status checks
- ✅ Deadline enforcement

---

**Status**: ✅ Deployed and Ready
**All Tests**: ✅ Passing (26/26)
**Documentation**: ✅ Complete
