// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Settlement
 * @notice Handles intent creation, fund management, and settlement for the MPC-based order splitting system
 * @dev Integrates with event nodes for distributed order processing
 */
contract Settlement is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Intent status enum
    enum IntentStatus {
        Pending,
        Filled,
        Cancelled
    }

    /// @notice Intent structure
    struct Intent {
        bytes32 intentId;
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 deadline;
        IntentStatus status;
        uint256 createdAt;
    }

    /// @notice Mapping of intent ID to Intent data
    mapping(bytes32 => Intent) public intents;

    /// @notice Mapping to track if an intent ID has been used
    mapping(bytes32 => bool) public intentExists;

    /// @notice Mapping to track node registrations
    mapping(address => bool) public registeredNodes;

    /// @notice Array of all registered nodes
    address[] public nodeList;

    /// @notice Minimum number of nodes required for settlement
    uint256 public minNodesRequired;

    /// @notice Events
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
    event NodeUnregistered(address indexed node);

    event FundsDeposited(
        bytes32 indexed intentId,
        address indexed user,
        address token,
        uint256 amount
    );

    event FundsWithdrawn(
        bytes32 indexed intentId,
        address indexed user,
        address token,
        uint256 amount
    );

    event SettlementExecuted(
        bytes32 indexed intentId,
        address indexed node,
        uint256 amount
    );

    /// @notice Constructor
    /// @param _minNodesRequired Minimum number of nodes required for settlement
    constructor(uint256 _minNodesRequired) Ownable(msg.sender) {
        require(_minNodesRequired > 0, "Invalid min nodes");
        minNodesRequired = _minNodesRequired;
    }

    /**
     * @notice Create a new swap intent
     * @param tokenIn Address of input token
     * @param tokenOut Address of output token
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum acceptable output amount
     * @param deadline Deadline for intent execution
     * @return intentId The generated intent ID
     */
    function createIntent(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 deadline
    ) external nonReentrant returns (bytes32 intentId) {
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(amountIn > 0, "Invalid amountIn");
        require(minAmountOut > 0, "Invalid minAmountOut");
        require(deadline > block.timestamp, "Invalid deadline");

        // Generate unique intent ID
        intentId = keccak256(
            abi.encodePacked(
                msg.sender,
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                deadline,
                block.timestamp,
                block.number
            )
        );

        require(!intentExists[intentId], "Intent already exists");

        // Transfer tokens from user to contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Store intent data
        intents[intentId] = Intent({
            intentId: intentId,
            user: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            deadline: deadline,
            status: IntentStatus.Pending,
            createdAt: block.timestamp
        });

        intentExists[intentId] = true;

        emit IntentCreated(
            intentId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            deadline
        );

        emit FundsDeposited(intentId, msg.sender, tokenIn, amountIn);

        return intentId;
    }

    /**
     * @notice Fill an intent with contributions from multiple nodes
     * @param intentId The intent to fill
     * @param nodes Array of node addresses participating
     * @param amounts Array of amounts each node is contributing
     * @param signatures Array of signatures from each node (for future validation)
     */
    function batchFillIntent(
        bytes32 intentId,
        address[] calldata nodes,
        uint256[] calldata amounts,
        bytes[] calldata signatures
    ) external nonReentrant {
        require(intentExists[intentId], "Intent does not exist");
        Intent storage intent = intents[intentId];
        
        require(intent.status == IntentStatus.Pending, "Intent not pending");
        require(block.timestamp <= intent.deadline, "Intent expired");
        require(nodes.length == amounts.length, "Length mismatch");
        require(nodes.length == signatures.length, "Signature length mismatch");
        require(nodes.length >= minNodesRequired, "Insufficient nodes");

        for (uint256 i = 0; i < nodes.length; i++) {
            for (uint256 j = i + 1; j < nodes.length; j++) {
                require(nodes[i] != nodes[j], "Duplicate node");
            }
        }

        // Calculate total output amount
        uint256 totalAmountOut = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Invalid amount");
            require(registeredNodes[nodes[i]], "Node not registered");
            totalAmountOut += amounts[i];
        }

        require(totalAmountOut >= intent.minAmountOut, "Insufficient output amount");

        // Update intent status
        intent.status = IntentStatus.Filled;

        // Transfer input tokens to nodes
        uint256 totalAllocated = 0;
        for (uint256 i = 0; i < nodes.length; i++) {
            // Calculate proportional allocation based on output contribution
            uint256 allocation = (intent.amountIn * amounts[i]) / totalAmountOut;
            
            // Handle rounding for last node
            if (i == nodes.length - 1) {
                allocation = intent.amountIn - totalAllocated;
            }
            
            IERC20(intent.tokenIn).safeTransfer(nodes[i], allocation);
            totalAllocated += allocation;

            emit SettlementExecuted(intentId, nodes[i], allocation);
        }

        // Transfer output tokens from nodes to user
        for (uint256 i = 0; i < nodes.length; i++) {
            IERC20(intent.tokenOut).safeTransferFrom(nodes[i], intent.user, amounts[i]);
        }

        emit IntentFilled(intentId, totalAmountOut, nodes.length);
        emit FundsWithdrawn(intentId, intent.user, intent.tokenOut, totalAmountOut);
    }

    /**
     * @notice Cancel an intent and refund the user
     * @param intentId The intent to cancel
     */
    function cancelIntent(bytes32 intentId) external nonReentrant {
        require(intentExists[intentId], "Intent does not exist");
        Intent storage intent = intents[intentId];
        
        require(msg.sender == intent.user, "Only user can cancel");
        require(intent.status == IntentStatus.Pending, "Intent not pending");

        // Update status
        intent.status = IntentStatus.Cancelled;

        // Refund input tokens to user
        IERC20(intent.tokenIn).safeTransfer(intent.user, intent.amountIn);

        emit IntentCancelled(intentId, msg.sender);
        emit FundsWithdrawn(intentId, msg.sender, intent.tokenIn, intent.amountIn);
    }

    /**
     * @notice Register a node for settlement participation
     * @param node Address of the node to register
     */
    function registerNode(address node) external onlyOwner {
        require(node != address(0), "Invalid node address");
        require(!registeredNodes[node], "Node already registered");

        registeredNodes[node] = true;
        nodeList.push(node);

        emit NodeRegistered(node);
    }

    /**
     * @notice Unregister a node
     * @param node Address of the node to unregister
     */
    function unregisterNode(address node) external onlyOwner {
        require(registeredNodes[node], "Node not registered");

        registeredNodes[node] = false;

        // Remove from nodeList
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodeList[i] == node) {
                nodeList[i] = nodeList[nodeList.length - 1];
                nodeList.pop();
                break;
            }
        }

        emit NodeUnregistered(node);
    }

    /**
     * @notice Update minimum nodes required
     * @param _minNodesRequired New minimum nodes value
     */
    function updateMinNodesRequired(uint256 _minNodesRequired) external onlyOwner {
        require(_minNodesRequired > 0, "Invalid min nodes");
        minNodesRequired = _minNodesRequired;
    }

    /**
     * @notice Get intent details
     * @param intentId The intent ID
     * @return Intent data
     */
    function getIntent(bytes32 intentId) external view returns (Intent memory) {
        require(intentExists[intentId], "Intent does not exist");
        return intents[intentId];
    }

    /**
     * @notice Get intent status
     * @param intentId The intent ID
     * @return Status of the intent
     */
    function getIntentStatus(bytes32 intentId) external view returns (uint8) {
        require(intentExists[intentId], "Intent does not exist");
        return uint8(intents[intentId].status);
    }

    /**
     * @notice Check if a node is registered
     * @param node Address to check
     * @return True if registered
     */
    function isNodeRegistered(address node) external view returns (bool) {
        return registeredNodes[node];
    }

    /**
     * @notice Get all registered nodes
     * @return Array of registered node addresses
     */
    function getRegisteredNodes() external view returns (address[] memory) {
        return nodeList;
    }

    /**
     * @notice Get count of registered nodes
     * @return Number of registered nodes
     */
    function getNodeCount() external view returns (uint256) {
        return nodeList.length;
    }
}
