/**
 * Unit tests for MPC session management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MPCSessionManager } from '../../src/mpc/session.js';
import type { ReplicatedShares } from '../../src/types.js';

describe('MPC Session Manager', () => {
  let sessionManager: MPCSessionManager;

  beforeEach(() => {
    sessionManager = new MPCSessionManager(0);
  });

  describe('createSession', () => {
    it('should create a new session', () => {
      const intentId = '0x123';
      const parties = [0, 1, 2];

      const session = sessionManager.createSession(intentId, parties);

      expect(session).toBeDefined();
      expect(session.intentId).toBe(intentId);
      expect(session.parties).toEqual(parties);
      expect(session.myPartyId).toBe(0);
      expect(session.status).toBe('initializing');
      expect(session.shares.size).toBe(0);
    });

    it('should generate unique session IDs', () => {
      const intentId = '0x123';
      const parties = [0, 1, 2];

      const session1 = sessionManager.createSession(intentId, parties);
      const session2 = sessionManager.createSession(intentId, parties);

      expect(session1.id).not.toBe(session2.id);
    });

    it('should set correct start time', () => {
      const before = Date.now();
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const after = Date.now();

      expect(session.startTime).toBeGreaterThanOrEqual(before);
      expect(session.startTime).toBeLessThanOrEqual(after);
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const retrieved = sessionManager.getSession(session.id);

      expect(retrieved).toBe(session);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.getSession('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getSessionByIntent', () => {
    it('should find session by intent ID', () => {
      const intentId = '0x123';
      const session = sessionManager.createSession(intentId, [0, 1, 2]);

      const found = sessionManager.getSessionByIntent(intentId);
      expect(found).toBe(session);
    });

    it('should return undefined if intent not found', () => {
      const found = sessionManager.getSessionByIntent('0x999');
      expect(found).toBeUndefined();
    });

    it('should return first matching session if multiple exist', () => {
      const intentId = '0x123';
      const session1 = sessionManager.createSession(intentId, [0, 1, 2]);
      const session2 = sessionManager.createSession(intentId, [0, 1, 2]);

      const found = sessionManager.getSessionByIntent(intentId);
      expect(found).toBeDefined();
      expect([session1.id, session2.id]).toContain(found!.id);
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);

      sessionManager.updateSessionStatus(session.id, 'sharing');
      expect(session.status).toBe('sharing');

      sessionManager.updateSessionStatus(session.id, 'computing');
      expect(session.status).toBe('computing');
    });

    it('should set end time when completed', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);

      sessionManager.updateSessionStatus(session.id, 'completed');
      expect(session.endTime).toBeDefined();
      expect(session.endTime!).toBeGreaterThanOrEqual(session.startTime);
    });

    it('should set end time when failed', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);

      sessionManager.updateSessionStatus(session.id, 'failed');
      expect(session.endTime).toBeDefined();
    });

    it('should not set end time for intermediate statuses', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);

      sessionManager.updateSessionStatus(session.id, 'sharing');
      expect(session.endTime).toBeUndefined();

      sessionManager.updateSessionStatus(session.id, 'computing');
      expect(session.endTime).toBeUndefined();
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => {
        sessionManager.updateSessionStatus('nonexistent', 'completed');
      }).not.toThrow();
    });
  });

  describe('storeShares', () => {
    it('should store shares for a variable', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const shares: ReplicatedShares = { share1: 100n, share2: 200n };

      sessionManager.storeShares(session.id, 'capacity_0', shares);

      expect(session.shares.get('capacity_0')).toEqual(shares);
    });

    it('should overwrite existing shares', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const shares1: ReplicatedShares = { share1: 100n, share2: 200n };
      const shares2: ReplicatedShares = { share1: 300n, share2: 400n };

      sessionManager.storeShares(session.id, 'capacity_0', shares1);
      sessionManager.storeShares(session.id, 'capacity_0', shares2);

      expect(session.shares.get('capacity_0')).toEqual(shares2);
    });

    it('should store multiple variables', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const shares1: ReplicatedShares = { share1: 100n, share2: 200n };
      const shares2: ReplicatedShares = { share1: 300n, share2: 400n };

      sessionManager.storeShares(session.id, 'capacity_0', shares1);
      sessionManager.storeShares(session.id, 'capacity_1', shares2);

      expect(session.shares.size).toBe(2);
      expect(session.shares.get('capacity_0')).toEqual(shares1);
      expect(session.shares.get('capacity_1')).toEqual(shares2);
    });
  });

  describe('getShares', () => {
    it('should retrieve stored shares', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const shares: ReplicatedShares = { share1: 100n, share2: 200n };

      sessionManager.storeShares(session.id, 'capacity_0', shares);
      const retrieved = sessionManager.getShares(session.id, 'capacity_0');

      expect(retrieved).toEqual(shares);
    });

    it('should return undefined for non-existent variable', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      const retrieved = sessionManager.getShares(session.id, 'nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.getShares('nonexistent', 'capacity_0');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', () => {
      const session1 = sessionManager.createSession('0x123', [0, 1, 2]);
      const session2 = sessionManager.createSession('0x456', [0, 1, 2]);

      const active = sessionManager.getActiveSessions();

      expect(active.length).toBe(2);
      expect(active).toContain(session1);
      expect(active).toContain(session2);
    });

    it('should not include completed sessions', () => {
      const session1 = sessionManager.createSession('0x123', [0, 1, 2]);
      const session2 = sessionManager.createSession('0x456', [0, 1, 2]);

      sessionManager.updateSessionStatus(session1.id, 'completed');

      const active = sessionManager.getActiveSessions();

      expect(active.length).toBe(1);
      expect(active).not.toContain(session1);
      expect(active).toContain(session2);
    });

    it('should not include failed sessions', () => {
      const session1 = sessionManager.createSession('0x123', [0, 1, 2]);
      const session2 = sessionManager.createSession('0x456', [0, 1, 2]);

      sessionManager.updateSessionStatus(session1.id, 'failed');

      const active = sessionManager.getActiveSessions();

      expect(active.length).toBe(1);
      expect(active).toContain(session2);
    });

    it('should return empty array when no sessions exist', () => {
      const active = sessionManager.getActiveSessions();
      expect(active).toEqual([]);
    });
  });

  describe('cleanupOldSessions', () => {
    it('should remove old completed sessions', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      sessionManager.updateSessionStatus(session.id, 'completed');

      // Mock old end time
      session.endTime = Date.now() - 7200000; // 2 hours ago

      sessionManager.cleanupOldSessions(3600000); // 1 hour threshold

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not remove recent completed sessions', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      sessionManager.updateSessionStatus(session.id, 'completed');

      sessionManager.cleanupOldSessions(3600000);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBe(session);
    });

    it('should not remove active sessions', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);

      sessionManager.cleanupOldSessions(0); // Even with 0 threshold

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBe(session);
    });

    it('should remove multiple old sessions', () => {
      const session1 = sessionManager.createSession('0x123', [0, 1, 2]);
      const session2 = sessionManager.createSession('0x456', [0, 1, 2]);

      sessionManager.updateSessionStatus(session1.id, 'completed');
      sessionManager.updateSessionStatus(session2.id, 'completed');

      session1.endTime = Date.now() - 7200000;
      session2.endTime = Date.now() - 7200000;

      sessionManager.cleanupOldSessions(3600000);

      expect(sessionManager.getSession(session1.id)).toBeUndefined();
      expect(sessionManager.getSession(session2.id)).toBeUndefined();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', () => {
      const session = sessionManager.createSession('0x123', [0, 1, 2]);
      
      sessionManager.deleteSession(session.id);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeUndefined();
    });

    it('should handle deleting non-existent session', () => {
      expect(() => {
        sessionManager.deleteSession('nonexistent');
      }).not.toThrow();
    });
  });

  describe('Multiple Party Managers', () => {
    it('should maintain separate state for different parties', () => {
      const manager0 = new MPCSessionManager(0);
      const manager1 = new MPCSessionManager(1);
      const manager2 = new MPCSessionManager(2);

      const session0 = manager0.createSession('0x123', [0, 1, 2]);
      const session1 = manager1.createSession('0x123', [0, 1, 2]);
      const session2 = manager2.createSession('0x123', [0, 1, 2]);

      expect(session0.myPartyId).toBe(0);
      expect(session1.myPartyId).toBe(1);
      expect(session2.myPartyId).toBe(2);

      expect(manager0.getActiveSessions().length).toBe(1);
      expect(manager1.getActiveSessions().length).toBe(1);
      expect(manager2.getActiveSessions().length).toBe(1);
    });
  });
});
