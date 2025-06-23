// @flow

import { getConfig } from './config.js';
import {
  translateClientDBMessageInfoToRawMessageInfo,
  translateClientDBThreadMessageInfos,
} from './message-ops-utils.js';
import { createReplaceThreadOperation } from '../ops/create-replace-thread-operation.js';
import type { EntryStoreOperation } from '../ops/entries-store-ops.js';
import { createReplaceEntryOperation } from '../ops/entries-store-ops.js';
import type { MessageStoreOperation } from '../ops/message-store-ops.js';
import {
  createReplaceMessageOperation,
  createReplaceMessageStoreLocalOperation,
  createReplaceMessageStoreThreadsOperations,
} from '../ops/message-store-ops.js';
import type { ThreadActivityStoreOperation } from '../ops/thread-activity-store-ops.js';
import { createReplaceThreadActivityEntryOperation } from '../ops/thread-activity-store-ops.js';
import type { ThreadStoreOperation } from '../ops/thread-store-ops.js';
import { messageID } from '../shared/id-utils.js';
import { databaseIdentifier } from '../types/database-identifier-types.js';
import type { ThreadMessageInfo } from '../types/message-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';

// This function is used only as part of migration 92 to move data
// to new, backup tables.
// This code shouldn't be used in any other use-case.
async function migrateStoreToBackupTables(): Promise<StoreOperations> {
  // 1. Get current client store
  const {
    threadStore,
    threadActivityStore,
    entries,
    messages,
    messageStoreThreads,
    messageStoreLocalMessageInfos,
  } = await getConfig().sqliteAPI.getClientDBStore(databaseIdentifier.MAIN);

  const threadInfos: RawThreadInfos = threadStore?.threadInfos ?? {};

  // 2. Prepare ThreadStore operations
  const threadIDsToMove: Array<string> = [];
  let threadStoreOperations: Array<ThreadStoreOperation> = [];
  for (const threadID in threadInfos) {
    const op = createReplaceThreadOperation(threadID, threadInfos[threadID]);
    // Avoid replacing data already existing in the non-backup table
    if (op.payload.isBackedUp) {
      threadIDsToMove.push(threadID);
      threadStoreOperations.push(op);
    }
  }
  if (threadIDsToMove.length) {
    threadStoreOperations = [
      { type: 'remove', payload: { ids: threadIDsToMove } },
      ...threadStoreOperations,
    ];
  }

  // 3. Prepare ThreadActivityStore operations
  const threadActivityIDsToMove: Array<string> = [];
  let threadActivityStoreOperations: Array<ThreadActivityStoreOperation> = [];
  for (const threadID in threadActivityStore) {
    const op = createReplaceThreadActivityEntryOperation(
      threadID,
      threadActivityStore[threadID],
      threadInfos,
    );
    if (op.payload.isBackedUp) {
      threadActivityIDsToMove.push(threadID);
      threadActivityStoreOperations.push(op);
    }
  }
  if (threadActivityIDsToMove.length) {
    threadActivityStoreOperations = [
      {
        type: 'remove_thread_activity_entries',
        payload: { ids: threadActivityIDsToMove },
      },
      ...threadActivityStoreOperations,
    ];
  }

  // 4. Prepare EntryStore operations
  const entryIDsToMove: Array<string> = [];
  let entryStoreOperations: Array<EntryStoreOperation> = [];
  for (const entryID in entries) {
    const op = createReplaceEntryOperation(
      entryID,
      entries[entryID],
      threadInfos,
    );
    if (op.payload.isBackedUp) {
      entryIDsToMove.push(entryID);
      entryStoreOperations.push(op);
    }
  }
  if (entryIDsToMove.length) {
    entryStoreOperations = [
      { type: 'remove_entries', payload: { ids: entryIDsToMove } },
      ...entryStoreOperations,
    ];
  }

  // 5. Prepare MessageStore operations
  const messageIDsToMove: Array<string> = [];
  let messageStoreOperations: Array<MessageStoreOperation> = [];
  const rawMessageInfos =
    messages?.map(translateClientDBMessageInfoToRawMessageInfo) ?? [];
  for (const message of rawMessageInfos) {
    const msgID = messageID(message);
    const op = createReplaceMessageOperation(msgID, message, threadInfos);
    if (op.payload.isBackedUp) {
      messageIDsToMove.push(msgID);
      messageStoreOperations.push(op);
    }
  }
  if (messageIDsToMove.length) {
    messageStoreOperations = [
      { type: 'remove', payload: { ids: messageIDsToMove } },
      ...messageStoreOperations,
    ];
  }

  // 6. Prepare MessageStoreThreads operations
  const actionPayloadMessageStoreThreads = translateClientDBThreadMessageInfos(
    messageStoreThreads ?? [],
  );
  const newThreads: {
    [threadID: string]: ThreadMessageInfo,
  } = {};
  for (const threadID in actionPayloadMessageStoreThreads) {
    newThreads[threadID] = {
      ...actionPayloadMessageStoreThreads[threadID],
      // The messageIDs field is not stored in the database because
      // this value can be easily computed based on messages, and is
      // added in `message-reducer.js`. It is required here for
      // typechecking.
      messageIDs: [],
    };
  }
  // In the case of MessageStoreThreads, we always create two operations,
  // for backup and non-backup data. We do the same here to make code
  // cleaner and avoid duplicating logic
  // with `createReplaceMessageStoreThreadsOperations`.
  const messageStoreThreadsOperations: Array<MessageStoreOperation> = [
    { type: 'remove_all_threads' },
    ...createReplaceMessageStoreThreadsOperations(newThreads, threadInfos),
  ];

  // 7. Prepare MessageStoreLocal operations
  const localMessageIDsToMove: Array<string> = [];
  let localMessageStoreOperations: Array<MessageStoreOperation> = [];
  for (const localMessageID in messageStoreLocalMessageInfos) {
    const op = createReplaceMessageStoreLocalOperation(
      localMessageID,
      messageStoreLocalMessageInfos[localMessageID],
    );
    if (op.payload.isBackedUp) {
      localMessageIDsToMove.push(localMessageID);
      localMessageStoreOperations.push(op);
    }
  }
  if (localMessageIDsToMove.length) {
    localMessageStoreOperations = [
      {
        type: 'remove_local_message_infos',
        payload: { ids: localMessageIDsToMove },
      },
      ...localMessageStoreOperations,
    ];
  }

  return {
    threadStoreOperations,
    messageStoreOperations: [
      ...messageStoreOperations,
      ...messageStoreThreadsOperations,
      ...localMessageStoreOperations,
    ],
    entryStoreOperations,
    threadActivityStoreOperations,
  };
}

export { migrateStoreToBackupTables };
