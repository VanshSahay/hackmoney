/**
 * MPC Session Management
 * Handles the lifecycle of an MPC computation session
 */

import type {
  MPCSession,
  PartyId,
  IntentId,
  ReplicatedShares,
} from '../types.js';
import { randomFieldElement } from '../crypto/field.js';

export class MPCSessionManager {
  private sessions: Map<string, MPCSession> = new Map();
  private myPartyId: PartyId;
  
  constructor(myPartyId: PartyId) {
    this.myPartyId = myPartyId;
  }
  
  /**
   * Create a new MPC session for an intent
   */
  createSession(intentId: IntentId, parties: PartyId[]): MPCSession {
    const sessionId = this.generateSessionId(intentId);
    
    const session: MPCSession = {
      id: sessionId,
      intentId,
      parties,
      myPartyId: this.myPartyId,
      status: 'initializing',
      shares: new Map(),
      startTime: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  /**
   * Get an existing session
   */
  getSession(sessionId: string): MPCSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get session by intent ID
   */
  getSessionByIntent(intentId: IntentId): MPCSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.intentId === intentId) {
        return session;
      }
    }
    return undefined;
  }
  
  /**
   * Update session status
   */
  updateSessionStatus(
    sessionId: string,
    status: MPCSession['status']
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'failed') {
        session.endTime = Date.now();
      }
    }
  }
  
  /**
   * Store shares for a variable in the session
   */
  storeShares(
    sessionId: string,
    variableName: string,
    shares: ReplicatedShares
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.shares.set(variableName, shares);
    }
  }
  
  /**
   * Get shares for a variable from the session
   */
  getShares(sessionId: string, variableName: string): ReplicatedShares | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      return session.shares.get(variableName);
    }
    return undefined;
  }
  
  /**
   * Clean up completed or failed sessions
   */
  cleanupOldSessions(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        (session.status === 'completed' || session.status === 'failed') &&
        session.endTime &&
        now - session.endTime > maxAgeMs
      ) {
        this.sessions.delete(sessionId);
      }
    }
  }
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): MPCSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.status !== 'completed' && s.status !== 'failed'
    );
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(intentId: IntentId): string {
    const random = randomFieldElement().toString(16).slice(0, 8);
    return `${intentId}-${random}`;
  }
  
  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
