// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {Settlement} from "../src/Settlement.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract SettlementTest is Test {
    Settlement public settlement;
    ERC20Mock public tokenIn;
    ERC20Mock public tokenOut;

    address public user = address(0x1);
    address public node1 = address(0x2);
    address public node2 = address(0x3);
    address public node3 = address(0x4);
    address public owner = address(this);

    uint256 constant MIN_NODES = 2;
    uint256 constant INITIAL_BALANCE = 1000000 ether;

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

    event IntentCancelled(
        bytes32 indexed intentId,
        address indexed user
    );

    event NodeRegistered(address indexed node);

    function setUp() public {
        // Deploy contracts
        settlement = new Settlement(MIN_NODES);
        tokenIn = new ERC20Mock("Token In", "TIN", 18);
        tokenOut = new ERC20Mock("Token Out", "TOUT", 18);

        // Mint tokens
        tokenIn.mint(user, INITIAL_BALANCE);
        tokenOut.mint(node1, INITIAL_BALANCE);
        tokenOut.mint(node2, INITIAL_BALANCE);
        tokenOut.mint(node3, INITIAL_BALANCE);

        // Register nodes
        settlement.registerNode(node1);
        settlement.registerNode(node2);
        settlement.registerNode(node3);
    }

    function test_Deployment() public view {
        assertEq(settlement.minNodesRequired(), MIN_NODES);
        assertEq(settlement.owner(), owner);
    }

    function test_RegisterNode() public {
        address newNode = address(0x5);
        
        vm.expectEmit(true, false, false, false);
        emit NodeRegistered(newNode);
        
        settlement.registerNode(newNode);
        
        assertTrue(settlement.isNodeRegistered(newNode));
        assertEq(settlement.getNodeCount(), 4);
    }

    function test_RegisterNode_RevertIfAlreadyRegistered() public {
        vm.expectRevert("Node already registered");
        settlement.registerNode(node1);
    }

    function test_RegisterNode_RevertIfNotOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user));
        settlement.registerNode(address(0x5));
    }

    function test_UnregisterNode() public {
        settlement.unregisterNode(node1);
        
        assertFalse(settlement.isNodeRegistered(node1));
        assertEq(settlement.getNodeCount(), 2);
    }

    function test_CreateIntent() public {
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);

        vm.expectEmit(false, true, false, true);
        emit IntentCreated(
            bytes32(0), // We don't know the intentId yet
            user,
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );

        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Verify intent was created
        Settlement.Intent memory intent = settlement.getIntent(intentId);
        assertEq(intent.user, user);
        assertEq(intent.tokenIn, address(tokenIn));
        assertEq(intent.tokenOut, address(tokenOut));
        assertEq(intent.amountIn, amountIn);
        assertEq(intent.minAmountOut, minAmountOut);
        assertEq(intent.deadline, deadline);
        assertEq(uint8(intent.status), uint8(Settlement.IntentStatus.Pending));

        // Verify tokens were transferred
        assertEq(tokenIn.balanceOf(address(settlement)), amountIn);
        assertEq(tokenIn.balanceOf(user), INITIAL_BALANCE - amountIn);
    }

    function test_CreateIntent_RevertIfInvalidTokenIn() public {
        vm.prank(user);
        vm.expectRevert("Invalid tokenIn");
        settlement.createIntent(
            address(0),
            address(tokenOut),
            100 ether,
            95 ether,
            block.timestamp + 1 hours
        );
    }

    function test_CreateIntent_RevertIfInvalidTokenOut() public {
        vm.prank(user);
        vm.expectRevert("Invalid tokenOut");
        settlement.createIntent(
            address(tokenIn),
            address(0),
            100 ether,
            95 ether,
            block.timestamp + 1 hours
        );
    }

    function test_CreateIntent_RevertIfInvalidAmountIn() public {
        vm.prank(user);
        vm.expectRevert("Invalid amountIn");
        settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            0,
            95 ether,
            block.timestamp + 1 hours
        );
    }

    function test_CreateIntent_RevertIfInvalidMinAmountOut() public {
        vm.prank(user);
        vm.expectRevert("Invalid minAmountOut");
        settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            100 ether,
            0,
            block.timestamp + 1 hours
        );
    }

    function test_CreateIntent_RevertIfExpiredDeadline() public {
        vm.prank(user);
        vm.expectRevert("Invalid deadline");
        settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            100 ether,
            95 ether,
            block.timestamp - 1
        );
    }

    function test_BatchFillIntent() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Prepare batch fill
        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = node2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50 ether;
        amounts[1] = 50 ether;

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        // Approve tokens from nodes
        vm.prank(node1);
        tokenOut.approve(address(settlement), amounts[0]);
        
        vm.prank(node2);
        tokenOut.approve(address(settlement), amounts[1]);

        // Record balances before
        uint256 userBalanceBefore = tokenOut.balanceOf(user);

        // Fill intent
        vm.expectEmit(true, false, false, true);
        emit IntentFilled(intentId, 100 ether, 2);

        settlement.batchFillIntent(intentId, nodes, amounts, signatures);

        // Verify intent status
        Settlement.Intent memory intent = settlement.getIntent(intentId);
        assertEq(uint8(intent.status), uint8(Settlement.IntentStatus.Filled));

        // Verify token transfers
        assertEq(tokenOut.balanceOf(user), userBalanceBefore + 100 ether);
        assertEq(tokenIn.balanceOf(node1), 50 ether);
        assertEq(tokenIn.balanceOf(node2), 50 ether);
    }

    function test_BatchFillIntent_ProportionalAllocation() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Node1 contributes 70%, node2 contributes 30%
        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = node2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 70 ether; // 70%
        amounts[1] = 30 ether; // 30%

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        // Approve tokens from nodes
        vm.prank(node1);
        tokenOut.approve(address(settlement), amounts[0]);
        
        vm.prank(node2);
        tokenOut.approve(address(settlement), amounts[1]);

        // Fill intent
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);

        // Verify proportional allocation (allowing for rounding)
        // Node1 should get ~70 tokenIn, node2 should get ~30 tokenIn
        assertGe(tokenIn.balanceOf(node1), 69 ether);
        assertLe(tokenIn.balanceOf(node1), 71 ether);
        assertGe(tokenIn.balanceOf(node2), 29 ether);
        assertLe(tokenIn.balanceOf(node2), 31 ether);
    }

    function test_BatchFillIntent_RevertIfIntentDoesNotExist() public {
        address[] memory nodes = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        bytes[] memory signatures = new bytes[](2);

        vm.expectRevert("Intent does not exist");
        settlement.batchFillIntent(bytes32(0), nodes, amounts, signatures);
    }

    function test_BatchFillIntent_RevertIfNotPending() public {
        // Create and fill intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Fill intent first time
        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = node2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50 ether;
        amounts[1] = 50 ether;

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        vm.prank(node1);
        tokenOut.approve(address(settlement), amounts[0]);
        
        vm.prank(node2);
        tokenOut.approve(address(settlement), amounts[1]);

        settlement.batchFillIntent(intentId, nodes, amounts, signatures);

        // Try to fill again
        vm.expectRevert("Intent not pending");
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);
    }

    function test_BatchFillIntent_RevertIfExpired() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Fast forward past deadline
        vm.warp(deadline + 1);

        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = node2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50 ether;
        amounts[1] = 50 ether;

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        vm.expectRevert("Intent expired");
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);
    }

    function test_BatchFillIntent_RevertIfInsufficientNodes() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Try with only 1 node (min is 2)
        address[] memory nodes = new address[](1);
        nodes[0] = node1;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 ether;

        bytes[] memory signatures = new bytes[](1);
        signatures[0] = hex"00";

        vm.expectRevert("Insufficient nodes");
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);
    }

    function test_BatchFillIntent_RevertIfInsufficientOutput() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Provide output below minimum
        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = node2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 40 ether;
        amounts[1] = 40 ether; // Total 80 < 95

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        vm.expectRevert("Insufficient output amount");
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);
    }

    function test_BatchFillIntent_RevertIfNodeNotRegistered() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        // Use unregistered node
        address unregisteredNode = address(0x999);
        
        address[] memory nodes = new address[](2);
        nodes[0] = node1;
        nodes[1] = unregisteredNode;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50 ether;
        amounts[1] = 50 ether;

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = hex"00";
        signatures[1] = hex"00";

        vm.expectRevert("Node not registered");
        settlement.batchFillIntent(intentId, nodes, amounts, signatures);
    }

    function test_CancelIntent() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );

        uint256 balanceBefore = tokenIn.balanceOf(user);

        vm.expectEmit(true, true, false, false);
        emit IntentCancelled(intentId, user);

        settlement.cancelIntent(intentId);
        vm.stopPrank();

        // Verify status and refund
        Settlement.Intent memory intent = settlement.getIntent(intentId);
        assertEq(uint8(intent.status), uint8(Settlement.IntentStatus.Cancelled));
        assertEq(tokenIn.balanceOf(user), balanceBefore + amountIn);
    }

    function test_CancelIntent_RevertIfNotUser() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        vm.prank(node1);
        vm.expectRevert("Only user can cancel");
        settlement.cancelIntent(intentId);
    }

    function test_CancelIntent_RevertIfNotPending() public {
        // Create intent
        uint256 amountIn = 100 ether;
        uint256 minAmountOut = 95 ether;
        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );

        // Cancel once
        settlement.cancelIntent(intentId);

        // Try to cancel again
        vm.expectRevert("Intent not pending");
        settlement.cancelIntent(intentId);
        vm.stopPrank();
    }

    function test_UpdateMinNodesRequired() public {
        settlement.updateMinNodesRequired(3);
        assertEq(settlement.minNodesRequired(), 3);
    }

    function test_UpdateMinNodesRequired_RevertIfZero() public {
        vm.expectRevert("Invalid min nodes");
        settlement.updateMinNodesRequired(0);
    }

    function test_GetRegisteredNodes() public view {
        address[] memory nodes = settlement.getRegisteredNodes();
        assertEq(nodes.length, 3);
        assertEq(nodes[0], node1);
        assertEq(nodes[1], node2);
        assertEq(nodes[2], node3);
    }

    function testFuzz_CreateIntent(
        uint256 amountIn,
        uint256 minAmountOut
    ) public {
        // Bound inputs to reasonable values
        amountIn = bound(amountIn, 1 ether, INITIAL_BALANCE);
        minAmountOut = bound(minAmountOut, 1 ether, amountIn * 2);

        uint256 deadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        tokenIn.approve(address(settlement), amountIn);
        
        bytes32 intentId = settlement.createIntent(
            address(tokenIn),
            address(tokenOut),
            amountIn,
            minAmountOut,
            deadline
        );
        vm.stopPrank();

        Settlement.Intent memory intent = settlement.getIntent(intentId);
        assertEq(intent.amountIn, amountIn);
        assertEq(intent.minAmountOut, minAmountOut);
    }
}
