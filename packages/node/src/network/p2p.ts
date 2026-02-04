/**
 * P2P Networking Layer
 * Handles WebSocket-based communication between MPC parties
 */

import WebSocket, { WebSocketServer } from 'ws';
import type {
  P2PMessage,
  MessageType,
  PartyId,
  PartyConfig,
  ReplicatedShares,
} from '../types.js';

export type MessageHandler = (message: P2PMessage) => void | Promise<void>;

/**
 * P2P Network Manager
 * Manages connections to other MPC parties
 */
export class P2PNetwork {
  private myPartyId: PartyId;
  private myConfig: PartyConfig;
  private parties: Map<PartyId, PartyConfig> = new Map();
  private connections: Map<PartyId, WebSocket> = new Map();
  private server: WebSocketServer | null = null;
  private messageHandlers: Map<MessageType, MessageHandler[]> = new Map();
  private isRunning = false;
  
  constructor(myPartyId: PartyId, myConfig: PartyConfig, allParties: PartyConfig[]) {
    this.myPartyId = myPartyId;
    this.myConfig = myConfig;
    
    // Store all party configs
    for (const party of allParties) {
      this.parties.set(party.id, party);
    }
  }
  
  /**
   * Start the P2P network (server and client connections)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('P2P network already running');
      return;
    }
    
    // Start WebSocket server
    await this.startServer();
    
    // Connect to other parties
    await this.connectToParties();
    
    this.isRunning = true;
    console.log(`P2P network started for party ${this.myPartyId}`);
  }
  
  /**
   * Start WebSocket server to accept incoming connections
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = new WebSocketServer({ 
        port: this.myConfig.port,
        host: '0.0.0.0'
      });
      
      this.server.on('listening', () => {
        console.log(`WebSocket server listening on port ${this.myConfig.port}`);
        resolve();
      });
      
      this.server.on('error', (error) => {
        console.error('WebSocket server error:', error);
        reject(error);
      });
      
      this.server.on('connection', (ws: WebSocket, req) => {
        console.log('Incoming connection from:', req.socket.remoteAddress);
        
        // Handle incoming messages
        ws.on('message', async (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString()) as P2PMessage;
            await this.handleIncomingMessage(message, ws);
          } catch (error) {
            console.error('Error handling message:', error);
          }
        });
        
        ws.on('error', (error) => {
          console.error('WebSocket connection error:', error);
        });
        
        ws.on('close', () => {
          console.log('Connection closed');
        });
      });
    });
  }
  
  /**
   * Connect to other parties as a client
   */
  private async connectToParties(): Promise<void> {
    const connectionPromises: Promise<void>[] = [];
    
    for (const [partyId, config] of this.parties.entries()) {
      if (partyId === this.myPartyId) {
        continue; // Don't connect to ourselves
      }
      
      connectionPromises.push(this.connectToParty(partyId, config));
    }
    
    // Wait a bit for connections (with timeout)
    await Promise.race([
      Promise.allSettled(connectionPromises),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    
    console.log(`Connected to ${this.connections.size}/${this.parties.size - 1} parties`);
  }
  
  /**
   * Connect to a specific party
   */
  private async connectToParty(partyId: PartyId, config: PartyConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://${config.address}:${config.port}`;
      const ws = new WebSocket(url);
      
      const timeout = setTimeout(() => {
        ws.close();
        console.log(`Connection timeout to party ${partyId}`);
        resolve(); // Resolve anyway to not block other connections
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`Connected to party ${partyId} at ${url}`);
        this.connections.set(partyId, ws);
        resolve();
      });
      
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as P2PMessage;
          await this.handleIncomingMessage(message, ws);
        } catch (error) {
          console.error(`Error handling message from party ${partyId}:`, error);
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`Error connecting to party ${partyId}:`, error);
        resolve(); // Resolve to not block other connections
      });
      
      ws.on('close', () => {
        this.connections.delete(partyId);
        console.log(`Connection to party ${partyId} closed`);
      });
    });
  }
  
  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(message: P2PMessage, ws: WebSocket): Promise<void> {
    console.log(`Received ${message.type} from party ${message.from}`);
    
    // Get handlers for this message type
    const handlers = this.messageHandlers.get(message.type) || [];
    
    // Execute all handlers
    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error in message handler for ${message.type}:`, error);
      }
    }
  }
  
  /**
   * Register a message handler
   */
  onMessage(type: MessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }
  
  /**
   * Send a message to a specific party
   */
  async sendToParty(partyId: PartyId, message: Omit<P2PMessage, 'from' | 'timestamp'>): Promise<void> {
    const ws = this.connections.get(partyId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Not connected to party ${partyId}`);
    }
    
    const fullMessage: P2PMessage = {
      ...message,
      from: this.myPartyId,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(fullMessage), (error) => {
        if (error) {
          console.error(`Error sending message to party ${partyId}:`, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  /**
   * Broadcast a message to all parties
   */
  async broadcast(message: Omit<P2PMessage, 'from' | 'to' | 'timestamp'>): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const partyId of this.connections.keys()) {
      promises.push(
        this.sendToParty(partyId, { ...message, to: partyId })
      );
    }
    
    await Promise.allSettled(promises);
  }
  
  /**
   * Request shares from another party
   */
  async requestShares(
    partyId: PartyId,
    sessionId: string,
    variableName: string
  ): Promise<ReplicatedShares> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for shares from party ${partyId}`));
      }, 10000);
      
      // Register one-time handler for response
      const handler = (message: P2PMessage) => {
        if (
          message.from === partyId &&
          message.sessionId === sessionId &&
          message.payload.variable === variableName
        ) {
          clearTimeout(timeout);
          resolve(message.payload.shares);
        }
      };
      
      this.onMessage('RECONSTRUCTION_RESPONSE' as MessageType, handler);
      
      // Send request
      this.sendToParty(partyId, {
        type: 'RECONSTRUCTION_REQUEST' as MessageType,
        to: partyId,
        sessionId,
        payload: { variable: variableName },
      }).catch(reject);
    });
  }
  
  /**
   * Check if connected to a party
   */
  isConnected(partyId: PartyId): boolean {
    const ws = this.connections.get(partyId);
    return ws !== undefined && ws.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    let count = 0;
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * Stop the P2P network
   */
  async stop(): Promise<void> {
    // Close all client connections
    for (const ws of this.connections.values()) {
      ws.close();
    }
    this.connections.clear();
    
    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          console.log('WebSocket server closed');
          resolve();
        });
      });
    }
    
    this.isRunning = false;
    console.log('P2P network stopped');
  }
}

/**
 * Message builder helpers
 */
export class MessageBuilder {
  static shareDistribution(
    sessionId: string,
    to: PartyId,
    intentId: string,
    shares: { [partyId: number]: bigint }
  ): Omit<P2PMessage, 'from' | 'timestamp'> {
    return {
      type: 'SHARE_DISTRIBUTION' as MessageType,
      to,
      sessionId,
      payload: { intentId, shares },
    };
  }
  
  static computationRound(
    sessionId: string,
    to: PartyId,
    round: number,
    data: any
  ): Omit<P2PMessage, 'from' | 'timestamp'> {
    return {
      type: 'COMPUTATION_ROUND' as MessageType,
      to,
      sessionId,
      payload: { round, data },
    };
  }
  
  static reconstructionRequest(
    sessionId: string,
    to: PartyId,
    variable: string
  ): Omit<P2PMessage, 'from' | 'timestamp'> {
    return {
      type: 'RECONSTRUCTION_REQUEST' as MessageType,
      to,
      sessionId,
      payload: { variable },
    };
  }
  
  static reconstructionResponse(
    sessionId: string,
    to: PartyId,
    variable: string,
    shares: ReplicatedShares
  ): Omit<P2PMessage, 'from' | 'timestamp'> {
    return {
      type: 'RECONSTRUCTION_RESPONSE' as MessageType,
      to,
      sessionId,
      payload: { variable, shares },
    };
  }
  
  static settlementSignature(
    sessionId: string,
    to: PartyId,
    intentId: string,
    amount: bigint,
    signature: string
  ): Omit<P2PMessage, 'from' | 'timestamp'> {
    return {
      type: 'SETTLEMENT_SIGNATURE' as MessageType,
      to,
      sessionId,
      payload: { intentId, amount: amount.toString(), signature },
    };
  }
}
