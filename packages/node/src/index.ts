/**
 * MPC Server Entry Point
 * Privacy-preserving order splitting for DEX liquidity
 */

import { MPCServer } from './server.js';
import { loadConfig, validateConfig, printConfig } from './config.js';
import { displayWalletInfo } from './utils/wallet.js';

/**
 * Main entry point
 */
async function main() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🔐 MPC-BASED ORDER SPLITTING SERVER 🔐               ║');
  console.log('║     Privacy-Preserving DEX Liquidity Coordination             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  
  try {
    // Load configuration
    const config = loadConfig();
    
    // Display wallet information
    displayWalletInfo(config.wallet);
    
    // Validate and print configuration
    validateConfig(config);
    printConfig(config);
    
    // Create MPC server
    const server = new MPCServer({
      partyId: config.partyId,
      myConfig: {
        id: config.partyId,
        address: config.address,
        port: config.port,
        blockchainAddress: config.wallet.address,
      },
      allParties: config.peers,
      rpcUrl: config.rpcUrl,
      settlementAddress: config.settlementAddress,
      privateKey: config.privateKey,
      chainId: config.chainId,
      enableAutoSwap: config.enableAutoSwap,
    });
    
    // Set initial capacities
    for (const [token, amount] of config.initialCapacities.entries()) {
      server.setCapacity(token, amount);
    }
    
    // Start server
    await server.start();
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      await server.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    console.log('✅ Server is running and listening for intents');
    console.log('💡 Press Ctrl+C to stop\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
