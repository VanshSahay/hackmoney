/**
 * ENS and Node Identity Utilities
 * Handles node naming and peer discovery
 */

import { createHash } from 'crypto';
import type { Address } from 'viem';

/**
 * Node information
 */
export interface NodeInfo {
  name: string;          // ENS name or identifier (e.g., "alice.eth")
  partyId: number;       // Assigned party ID based on sorted peer list
  address: string;       // Network address (hostname/IP)
  port: number;          // Network port
  blockchainAddress?: Address; // Ethereum address (optional for peers)
}

/**
 * Generate a deterministic port number from a node name
 * This ensures the same node name always gets the same port
 */
export function generatePortFromName(nodeName: string, basePort: number = 3000): number {
  const hash = createHash('sha256').update(nodeName).digest();
  const offset = hash.readUInt16BE(0) % 1000; // 0-999 offset
  return basePort + offset;
}

/**
 * Parse peer list from environment variable
 * Expected format: "alice.eth,bob.eth,charlie.eth" or "alice.eth:3001,bob.eth:3002"
 */
export function parsePeerList(peersString: string): { name: string; port?: number }[] {
  if (!peersString || peersString.trim() === '') {
    return [];
  }
  
  return peersString.split(',').map(peer => {
    const trimmed = peer.trim();
    if (trimmed.includes(':')) {
      const [name, portStr] = trimmed.split(':');
      return { name, port: parseInt(portStr, 10) };
    }
    return { name: trimmed };
  });
}

/**
 * Resolve node addresses
 * For now, assumes all nodes are on localhost. In production, you'd use ENS or a discovery service.
 */
export function resolveNodeAddress(nodeName: string): string {
  // TODO: In production, implement ENS resolution or service discovery
  // For now, default to localhost
  return 'localhost';
}

/**
 * Create sorted node list with assigned party IDs
 * Nodes are sorted alphabetically by name to ensure consistent party ID assignment
 */
export function createNodeList(
  myNodeName: string,
  peers: { name: string; port?: number }[],
  myPort?: number
): NodeInfo[] {
  // Filter out own name from peers to avoid duplicates
  const otherPeers = peers.filter(peer => peer.name !== myNodeName);
  
  // Create list of all nodes including self
  const allNodes = [
    { name: myNodeName, port: myPort },
    ...otherPeers,
  ];
  
  // Sort by name to ensure consistent party ID assignment across all nodes
  allNodes.sort((a, b) => a.name.localeCompare(b.name));
  
  // Assign party IDs and resolve addresses
  return allNodes.map((node, index) => ({
    name: node.name,
    partyId: index,
    address: resolveNodeAddress(node.name),
    port: node.port ?? generatePortFromName(node.name),
  }));
}

/**
 * Find my node in the node list
 */
export function findMyNode(nodeList: NodeInfo[], myNodeName: string): NodeInfo {
  const myNode = nodeList.find(n => n.name === myNodeName);
  if (!myNode) {
    throw new Error(`Could not find node ${myNodeName} in node list`);
  }
  return myNode;
}

/**
 * Display node information
 */
export function displayNodeInfo(myNode: NodeInfo, allNodes: NodeInfo[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                       NODE INFORMATION                        ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║ Node Name:     ${myNode.name.padEnd(44)}║`);
  console.log(`║ Party ID:      ${myNode.partyId.toString().padEnd(44)}║`);
  console.log(`║ Network:       ${`${myNode.address}:${myNode.port}`.padEnd(44)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log('║ PEERS IN NETWORK                                              ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  
  for (const node of allNodes) {
    const isSelf = node.name === myNode.name;
    const marker = isSelf ? ' (YOU)' : '';
    const nodeStr = `Party ${node.partyId}: ${node.name} @ ${node.address}:${node.port}${marker}`;
    console.log(`║ ${nodeStr.padEnd(61)}║`);
  }
  
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

/**
 * Validate node name
 */
export function validateNodeName(nodeName: string): void {
  if (!nodeName || nodeName.trim() === '') {
    throw new Error('Node name cannot be empty');
  }
  
  // Check for valid characters (alphanumeric, dots, hyphens)
  if (!/^[a-zA-Z0-9.-]+$/.test(nodeName)) {
    throw new Error(
      `Invalid node name: ${nodeName}. ` +
      'Node names can only contain letters, numbers, dots, and hyphens.'
    );
  }
}
