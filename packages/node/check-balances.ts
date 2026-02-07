import { createPublicClient, http, formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';

const RPC_URL = 'https://base-sepolia.g.alchemy.com/v2/wfTWOqX-tfO2ahOiD3rCXzscObxKVms-';

// Node addresses
const NODE0 = '0xC67ef54A950320D1F226a225DFffD467E7991a1E';
const NODE1 = '0xE94Aed964d9579E5decf8491B3525CADD3f49919';
const NODE2 = '0x6dbE29E1bbe6b5f0CC4B324cb09e0DFC5377445e';
const DEPLOYER = '0x89fEdB2167197199Fd069122e5351A1C779F91B8';

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  
  console.log('💰 Checking balances on Base Sepolia...\n');
  
  const addresses = [
    { name: 'Deployer', address: DEPLOYER },
    { name: 'Node 0 (node0.veil)', address: NODE0 },
    { name: 'Node 1 (node1.veil)', address: NODE1 },
    { name: 'Node 2 (node2.veil)', address: NODE2 },
  ];
  
  for (const { name, address } of addresses) {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    const formatted = formatEther(balance);
    const sufficient = balance > 1000000000000000n ? '✅' : '⚠️';
    console.log(`${sufficient} ${name.padEnd(25)} ${formatted.padStart(10)} ETH  (${address})`);
  }
}

main().catch(console.error);
