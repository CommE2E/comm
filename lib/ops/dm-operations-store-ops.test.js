// @flow

import {
  convertQueuedDMOperationsStoreToAddOps,
  dmOperationsStoreOpsHandlers,
} from './dm-operations-store-ops.js';
import type { QueuedDMOperations } from '../types/dm-ops.js';

describe('convertQueuedDMOperationsStoreToAddOps', () => {
  // Shared mock operation for reuse
  const mockOperation = {
    type: 'send_text_message',
    threadID: 'thread1',
    creatorID: 'user123',
    time: 1642500000000,
    messageID: 'msg1',
    text: 'Mock operation',
  };

  it('should convert complete store to operations and back', () => {
    // Create mock store with data for all queue types
    const originalStore: QueuedDMOperations = {
      threadQueue: {
        thread1: [
          {
            operation: mockOperation,
            timestamp: 1642500000000,
          },
          {
            operation: { ...mockOperation, messageID: 'msg1b' },
            timestamp: 1642500001000,
          },
        ],
        thread2: [
          {
            operation: {
              ...mockOperation,
              threadID: 'thread2',
              messageID: 'msg2a',
            },
            timestamp: 1642500002000,
          },
        ],
      },
      messageQueue: {
        msg3: [
          {
            operation: mockOperation,
            timestamp: 1642500003000,
          },
          {
            operation: { ...mockOperation, messageID: 'msg3b' },
            timestamp: 1642500004000,
          },
        ],
        msg4: [
          {
            operation: { ...mockOperation, messageID: 'msg4a' },
            timestamp: 1642500005000,
          },
        ],
      },
      entryQueue: {
        entry1: [
          {
            operation: mockOperation,
            timestamp: 1642500006000,
          },
          {
            operation: { ...mockOperation, messageID: 'entry1b' },
            timestamp: 1642500007000,
          },
        ],
        entry2: [
          {
            operation: { ...mockOperation, messageID: 'entry2a' },
            timestamp: 1642500008000,
          },
        ],
      },
      membershipQueue: {
        thread1: {
          user123: [
            {
              operation: mockOperation,
              timestamp: 1642500009000,
            },
            {
              operation: { ...mockOperation, messageID: 'member1b' },
              timestamp: 1642500010000,
            },
          ],
          user456: [
            {
              operation: { ...mockOperation, messageID: 'member2a' },
              timestamp: 1642500011000,
            },
          ],
        },
        thread2: {
          user789: [
            {
              operation: {
                ...mockOperation,
                threadID: 'thread2',
                messageID: 'member3a',
              },
              timestamp: 1642500012000,
            },
          ],
        },
      },
      shimmedOperations: [
        {
          id: 'shimmed1',
          operation: mockOperation,
        },
        {
          id: 'shimmed2',
          operation: mockOperation,
        },
      ],
    };

    // Convert store to operations
    const operations = convertQueuedDMOperationsStoreToAddOps(originalStore);

    // Verify we have the correct number of operations
    // 3 thread + 3 message + 3 entry + 4 membership + 2 shimmed = 15 total
    expect(operations).toHaveLength(15);

    // Process operations back to store
    const emptyStore = {
      threadQueue: {},
      messageQueue: {},
      entryQueue: {},
      membershipQueue: {},
      shimmedOperations: [],
    };

    const reconstructedStore =
      dmOperationsStoreOpsHandlers.processStoreOperations(
        emptyStore,
        operations,
      );

    // Verify reconstructed store matches original
    expect(reconstructedStore).toEqual(originalStore);
  });

  it('should handle empty store', () => {
    const emptyStore = {
      threadQueue: {},
      messageQueue: {},
      entryQueue: {},
      membershipQueue: {},
      shimmedOperations: [],
    };

    const operations = convertQueuedDMOperationsStoreToAddOps(emptyStore);
    expect(operations).toHaveLength(0);

    const reconstructedStore =
      dmOperationsStoreOpsHandlers.processStoreOperations(
        emptyStore,
        operations,
      );
    expect(reconstructedStore).toEqual(emptyStore);
  });
});
