// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Settlement.sol";

contract RegisterNodes is Script {
    function run() external {
        address settlement = 0x56053B0ed4BB1b493c2B15FFa4BA21AF3d1492E4;
        
        // Node addresses from wallet generation
        address node0 = 0xC67ef54A950320D1F226a225DFffD467E7991a1E;
        address node1 = 0xE94Aed964d9579E5decf8491B3525CADD3f49919;
        address node2 = 0x6dbE29E1bbe6b5f0CC4B324cb09e0DFC5377445e;
        
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        Settlement settlementContract = Settlement(settlement);
        
        // Register nodes
        console.log("Registering node0:", node0);
        settlementContract.registerNode(node0);
        
        console.log("Registering node1:", node1);
        settlementContract.registerNode(node1);
        
        console.log("Registering node2:", node2);
        settlementContract.registerNode(node2);
        
        // Send some ETH to each node for gas
        console.log("\nFunding nodes with 0.01 ETH each...");
        payable(node0).transfer(0.01 ether);
        payable(node1).transfer(0.01 ether);
        payable(node2).transfer(0.01 ether);
        
        console.log("\n✅ All nodes registered and funded!");
        
        vm.stopBroadcast();
    }
}
