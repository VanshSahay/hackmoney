// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {Settlement} from "../src/Settlement.sol";

contract DeploySettlement is Script {
    function setUp() public {}

    function run() public {
        // Get deployer from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Settlement contract
        // Setting min nodes to 2 for testing (can be adjusted)
        uint256 minNodesRequired = 2;
        Settlement settlement = new Settlement(minNodesRequired);

        console2.log("Settlement deployed at:", address(settlement));
        console2.log("Minimum nodes required:", minNodesRequired);
        console2.log("Owner:", settlement.owner());

        vm.stopBroadcast();
    }
}
