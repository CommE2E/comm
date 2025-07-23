// @flow

import { reduceDMOperationsQueue } from './dm-operations-queue-reducer.js';
import {
  clearQueuedEntryDMOpsActionType,
  clearQueuedMembershipDMOpsActionType,
  clearQueuedMessageDMOpsActionType,
  clearQueuedThreadDMOpsActionType,
  type DMAddMembersOperation,
  type DMSendTextMessageOperation,
  type DMCreateEntryOperation,
  pruneDMOpsQueueActionType,
  type QueuedDMOperations,
  queueDMOpsActionType,
  type DMLeaveThreadOperation,
} from '../types/dm-ops.js';
import type { BaseAction } from '../types/redux-types.js';

const mockOperation: DMSendTextMessageOperation = {
  type: 'send_text_message',
  threadID: 'thread123',
  creatorID: 'user456',
  time: 1642500000000,
  messageID: 'msg789',
  text: 'Hello world',
};

const mockMembershipOperation: DMAddMembersOperation = {
  type: 'add_members',
  threadID: 'thread456',
  editorID: 'user789',
  time: 1642500001000,
  addedUserIDs: ['user123'],
  messageID: 'msg101',
};

describe('reduceDMOperationsQueue', () => {
  let initialStore: QueuedDMOperations;

  beforeEach(() => {
    initialStore = {
      threadQueue: {},
      messageQueue: {},
      entryQueue: {},
      membershipQueue: {},
      shimmedOperations: [],
    };
  });

  describe('queueDMOpsActionType', () => {
    it('should add operation to thread queue', () => {
      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: mockOperation,
          timestamp: 1642500000000,
          condition: {
            type: 'thread',
            threadID: 'thread123',
          },
        },
      };

      const result = reduceDMOperationsQueue(initialStore, action);

      expect(result.store.threadQueue).toEqual({
        thread123: [
          {
            operation: mockOperation,
            timestamp: 1642500000000,
          },
        ],
      });
      expect(result.operations).toEqual([]);
    });

    it('should add multiple operations to same thread queue', () => {
      const store = {
        ...initialStore,
        threadQueue: {
          thread123: [
            {
              operation: mockOperation,
              timestamp: 1642500000000,
            },
          ],
        },
      };

      const secondOperation: DMSendTextMessageOperation = {
        ...mockOperation,
        messageID: 'msg999',
        text: 'Second message',
      };

      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: secondOperation,
          timestamp: 1642500001000,
          condition: {
            type: 'thread',
            threadID: 'thread123',
          },
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.threadQueue.thread123).toHaveLength(2);
      expect(result.store.threadQueue.thread123[1]).toEqual({
        operation: secondOperation,
        timestamp: 1642500001000,
      });
    });

    it('should add operation to message queue', () => {
      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: mockOperation,
          timestamp: 1642500000000,
          condition: {
            type: 'message',
            messageID: 'msg789',
          },
        },
      };

      const result = reduceDMOperationsQueue(initialStore, action);

      expect(result.store.messageQueue).toEqual({
        msg789: [
          {
            operation: mockOperation,
            timestamp: 1642500000000,
          },
        ],
      });
      expect(result.operations).toEqual([]);
    });

    it('should add operation to entry queue', () => {
      const entryOperation: DMCreateEntryOperation = {
        type: 'create_entry',
        threadID: 'thread123',
        creatorID: 'user456',
        time: 1642500000000,
        entryID: 'entry123',
        entryDate: '2022-01-18',
        text: 'New entry',
        messageID: 'msg789',
      };

      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: entryOperation,
          timestamp: 1642500000000,
          condition: {
            type: 'entry',
            entryID: 'entry123',
          },
        },
      };

      const result = reduceDMOperationsQueue(initialStore, action);

      expect(result.store.entryQueue).toEqual({
        entry123: [
          {
            operation: entryOperation,
            timestamp: 1642500000000,
          },
        ],
      });
      expect(result.operations).toEqual([]);
    });

    it('should add operation to membership queue', () => {
      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: mockMembershipOperation,
          timestamp: 1642500001000,
          condition: {
            type: 'membership',
            threadID: 'thread456',
            userID: 'user123',
          },
        },
      };

      const result = reduceDMOperationsQueue(initialStore, action);

      expect(result.store.membershipQueue).toEqual({
        thread456: {
          user123: [
            {
              operation: mockMembershipOperation,
              timestamp: 1642500001000,
            },
          ],
        },
      });
      expect(result.operations).toEqual([]);
    });

    it('should add multiple operations to same membership queue', () => {
      const store = {
        ...initialStore,
        membershipQueue: {
          thread456: {
            user123: [
              {
                operation: mockMembershipOperation,
                timestamp: 1642500001000,
              },
            ],
          },
        },
      };

      const secondMembershipOperation: DMLeaveThreadOperation = {
        type: 'leave_thread',
        editorID: 'user789',
        time: 1642500001000,
        messageID: 'msg102',
        threadID: 'thread456',
      };

      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: secondMembershipOperation,
          timestamp: 1642500002000,
          condition: {
            type: 'membership',
            threadID: 'thread456',
            userID: 'user123',
          },
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.membershipQueue.thread456.user123).toHaveLength(2);
      expect(result.store.membershipQueue.thread456.user123[1]).toEqual({
        operation: secondMembershipOperation,
        timestamp: 1642500002000,
      });
    });

    it('should add operations for different users in same thread', () => {
      const store = {
        ...initialStore,
        membershipQueue: {
          thread456: {
            user123: [
              {
                operation: mockMembershipOperation,
                timestamp: 1642500001000,
              },
            ],
          },
        },
      };

      const action: BaseAction = {
        type: queueDMOpsActionType,
        payload: {
          operation: mockMembershipOperation,
          timestamp: 1642500002000,
          condition: {
            type: 'membership',
            threadID: 'thread456',
            userID: 'user789',
          },
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.membershipQueue.thread456).toEqual({
        user123: [
          {
            operation: mockMembershipOperation,
            timestamp: 1642500001000,
          },
        ],
        user789: [
          {
            operation: mockMembershipOperation,
            timestamp: 1642500002000,
          },
        ],
      });
    });
  });

  describe('pruneDMOpsQueueActionType', () => {
    it('should prune operations older than timestamp from all queues', () => {
      const store: QueuedDMOperations = {
        threadQueue: {
          thread1: [
            { operation: mockOperation, timestamp: 1642500000000 }, // old
            { operation: mockOperation, timestamp: 1642500002000 }, // keep
          ],
        },
        messageQueue: {
          msg1: [
            { operation: mockOperation, timestamp: 1642500000500 }, // old
            { operation: mockOperation, timestamp: 1642500001500 }, // keep
          ],
        },
        entryQueue: {
          entry1: [
            { operation: mockOperation, timestamp: 1642500000000 }, // old
          ],
        },
        membershipQueue: {
          thread2: {
            user1: [
              { operation: mockMembershipOperation, timestamp: 1642500000000 }, // old
              { operation: mockMembershipOperation, timestamp: 1642500002000 }, // keep
            ],
            user2: [
              { operation: mockMembershipOperation, timestamp: 1642500000500 }, // old
            ],
          },
        },
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: pruneDMOpsQueueActionType,
        payload: {
          pruneMaxTimestamp: 1642500001000,
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.threadQueue.thread1).toHaveLength(1);
      expect(result.store.threadQueue.thread1[0].timestamp).toBe(1642500002000);

      expect(result.store.messageQueue.msg1).toHaveLength(1);
      expect(result.store.messageQueue.msg1[0].timestamp).toBe(1642500001500);

      expect(result.store.entryQueue.entry1).toHaveLength(0);

      expect(result.store.membershipQueue.thread2.user1).toHaveLength(1);
      expect(result.store.membershipQueue.thread2.user1[0].timestamp).toBe(
        1642500002000,
      );
      expect(result.store.membershipQueue.thread2.user2).toHaveLength(0);

      expect(result.operations).toEqual([]);
    });

    it('should keep operations with timestamp equal to pruneMaxTimestamp', () => {
      const store: QueuedDMOperations = {
        threadQueue: {
          thread1: [
            { operation: mockOperation, timestamp: 1642500001000 }, // keep (equal)
            { operation: mockOperation, timestamp: 1642500000999 }, // remove (less)
            { operation: mockOperation, timestamp: 1642500001001 }, // keep (greater)
          ],
        },
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {},
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: pruneDMOpsQueueActionType,
        payload: {
          pruneMaxTimestamp: 1642500001000,
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.threadQueue.thread1).toHaveLength(2);
      expect(result.store.threadQueue.thread1.map(op => op.timestamp)).toEqual([
        1642500001000, 1642500001001,
      ]);
    });
  });

  describe('clear queue actions', () => {
    it('should clear thread queue', () => {
      const store: QueuedDMOperations = {
        threadQueue: {
          thread1: [{ operation: mockOperation, timestamp: 1642500000000 }],
          thread2: [{ operation: mockOperation, timestamp: 1642500001000 }],
        },
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {},
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedThreadDMOpsActionType,
        payload: {
          threadID: 'thread1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.threadQueue).toEqual({
        thread2: [{ operation: mockOperation, timestamp: 1642500001000 }],
      });
      expect(result.operations).toEqual([]);
    });

    it('should clear message queue', () => {
      const store: QueuedDMOperations = {
        threadQueue: {},
        messageQueue: {
          msg1: [{ operation: mockOperation, timestamp: 1642500000000 }],
          msg2: [{ operation: mockOperation, timestamp: 1642500001000 }],
        },
        entryQueue: {},
        membershipQueue: {},
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedMessageDMOpsActionType,
        payload: {
          messageID: 'msg1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.messageQueue).toEqual({
        msg2: [{ operation: mockOperation, timestamp: 1642500001000 }],
      });
      expect(result.operations).toEqual([]);
    });

    it('should clear entry queue', () => {
      const store: QueuedDMOperations = {
        threadQueue: {},
        messageQueue: {},
        entryQueue: {
          entry1: [{ operation: mockOperation, timestamp: 1642500000000 }],
          entry2: [{ operation: mockOperation, timestamp: 1642500001000 }],
        },
        membershipQueue: {},
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedEntryDMOpsActionType,
        payload: {
          entryID: 'entry1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.entryQueue).toEqual({
        entry2: [{ operation: mockOperation, timestamp: 1642500001000 }],
      });
      expect(result.operations).toEqual([]);
    });

    it('should clear membership queue for specific user', () => {
      const store: QueuedDMOperations = {
        threadQueue: {},
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {
          thread1: {
            user1: [
              { operation: mockMembershipOperation, timestamp: 1642500000000 },
            ],
            user2: [
              { operation: mockMembershipOperation, timestamp: 1642500001000 },
            ],
          },
        },
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedMembershipDMOpsActionType,
        payload: {
          threadID: 'thread1',
          userID: 'user1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.membershipQueue).toEqual({
        thread1: {
          user2: [
            { operation: mockMembershipOperation, timestamp: 1642500001000 },
          ],
        },
      });
      expect(result.operations).toEqual([]);
    });

    it('should remove entire thread from membership queue when last user is cleared', () => {
      const store: QueuedDMOperations = {
        threadQueue: {},
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {
          thread1: {
            user1: [
              { operation: mockMembershipOperation, timestamp: 1642500000000 },
            ],
          },
          thread2: {
            user2: [
              { operation: mockMembershipOperation, timestamp: 1642500001000 },
            ],
          },
        },
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedMembershipDMOpsActionType,
        payload: {
          threadID: 'thread1',
          userID: 'user1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store.membershipQueue).toEqual({
        thread2: {
          user2: [
            { operation: mockMembershipOperation, timestamp: 1642500001000 },
          ],
        },
      });
      expect(result.operations).toEqual([]);
    });

    it('should handle clearing non-existent membership queue gracefully', () => {
      const store: QueuedDMOperations = {
        threadQueue: {},
        messageQueue: {},
        entryQueue: {},
        membershipQueue: {},
        shimmedOperations: [],
      };

      const action: BaseAction = {
        type: clearQueuedMembershipDMOpsActionType,
        payload: {
          threadID: 'nonexistent',
          userID: 'user1',
        },
      };

      const result = reduceDMOperationsQueue(store, action);

      expect(result.store).toEqual(store);
      expect(result.operations).toEqual([]);
    });
  });
});
