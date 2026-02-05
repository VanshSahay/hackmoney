/**
 * MPC Server Entry Point
 * Privacy-preserving order splitting for DEX liquidity
 */

import { MPCServer } from './server.js';
import { loadConfig, validateConfig, printConfig } from './config.js';

/**
 * Main entry point
 */
async function main() {
  console.log('🔐 MPC-Based Order Splitting Server');
  console.log('Privacy-preserving DEX liquidity coordination\n');
  
  try {
    // Load configuration
    const config = loadConfig();
    validateConfig(config);
    printConfig(config);
    
    // Create MPC server
    const server = new MPCServer({
      partyId: config.partyId,
      myConfig: {
        id: config.partyId,
        address: config.address,
        port: config.port,
      },
      allParties: config.peers,
      rpcUrl: config.rpcUrl,
      hookAddress: config.hookAddress,
      settlementAddress: config.settlementAddress,
      privateKey: config.privateKey,
      chainId: config.chainId,
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
    
    console.log('✓ Server is running and listening for intents');
    console.log('Press Ctrl+C to stop\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
