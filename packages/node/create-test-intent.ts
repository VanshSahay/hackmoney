import { createPublicClient, createWalletClient, http, parseAbi, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const PRIVATE_KEY = '0x9d75962544708d5cd5896b138ff1d8ae64e11a64e9fd3cfeb9504fb4835bea78';
const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/wfTWOqX-tfO2ahOiD3rCXzscObxKVms-';
const SETTLEMENT_ADDRESS = '0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4';

// Example tokens on Base Sepolia (using WETH and a mock token)
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'; // Base Sepolia WETH
const MOCK_TOKEN = '0x0000000000000000000000000000000000000001'; // Placeholder

const SETTLEMENT_ABI = parseAbi([
  'function createIntent(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (bytes32)',
  'event IntentCreated(bytes32 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)',
]);

const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function deposit() external payable',
]);

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  console.log('🔧 Creating test intent from:', account.address);
  console.log('📝 Settlement contract:', SETTLEMENT_ADDRESS);
  console.log();
  
  // Step 1: Wrap some ETH to WETH
  console.log('Step 1: Wrapping ETH to WETH...');
  const wethBalance = await publicClient.readContract({
    address: WETH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });
  
  console.log('  Current WETH balance:', wethBalance.toString(), 'wei');
  
  if (wethBalance < parseEther('0.001')) {
    console.log('  Depositing 0.002 ETH to WETH...');
    const depositHash = await walletClient.writeContract({
      address: WETH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'deposit',
      value: parseEther('0.002'),
    });
    await publicClient.waitForTransactionReceipt({ hash: depositHash });
    console.log('  ✅ Deposited to WETH');
  } else {
    console.log('  ✅ Sufficient WETH balance');
  }
  
  // Step 2: Approve Settlement contract
  console.log('\nStep 2: Approving Settlement contract...');
  const allowance = await publicClient.readContract({
    address: WETH_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, SETTLEMENT_ADDRESS],
  });
  
  console.log('  Current allowance:', allowance.toString(), 'wei');
  
  if (allowance < parseEther('0.001')) {
    console.log('  Approving Settlement contract...');
    const approveHash = await walletClient.writeContract({
      address: WETH_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [SETTLEMENT_ADDRESS, parseEther('1')],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log('  ✅ Approved');
  } else {
    console.log('  ✅ Already approved');
  }
  
  // Step 3: Create intent
  
  console.log('\nStep 3: Creating intent...');
  // Create a test intent
  const tokenIn = WETH_ADDRESS;
  const tokenOut = MOCK_TOKEN;
  const amountIn = parseEther('0.001'); // 0.001 WETH
  const minAmountOut = parseEther('0.0009'); // Min 0.0009 of output token
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
  
  console.log('Intent parameters:');
  console.log('  Token In:', tokenIn);
  console.log('  Token Out:', tokenOut);
  console.log('  Amount In:', amountIn.toString(), 'wei (0.001 ETH)');
  console.log('  Min Amount Out:', minAmountOut.toString(), 'wei');
  console.log('  Deadline:', new Date(Number(deadline) * 1000).toISOString());
  console.log();
  
  try {
    console.log('🚀 Creating intent...');
    const hash = await walletClient.writeContract({
      address: SETTLEMENT_ADDRESS,
      abi: SETTLEMENT_ABI,
      functionName: 'createIntent',
      args: [tokenIn, tokenOut, amountIn, minAmountOut, deadline],
    });
    
    console.log('⏳ Transaction hash:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ Intent created in block:', receipt.blockNumber);
    console.log('🔍 Transaction receipt:', receipt.transactionHash);
    
    // Parse the IntentCreated event
    const logs = receipt.logs;
    console.log(`\n📊 ${logs.length} event(s) emitted`);
    
    if (logs.length > 0) {
      console.log('\n✅ The MPC nodes should now detect this intent and start the protocol!');
      console.log('   Check the node logs to see them processing the intent.');
    }
  } catch (error) {
    console.error('❌ Error creating intent:', error);
  }
}

main().catch(console.error);
