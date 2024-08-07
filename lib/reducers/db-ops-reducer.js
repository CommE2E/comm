// @flow

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import type { MessageSearchStoreOperation } from '../message-search-types.js';
import type { MessageStoreOperation } from '../ops/message-store-ops.js';
import type {
  MessageSourceMetadata,
  DBOpsStore,
} from '../types/db-ops-types.js';
import {
  scheduleP2PMessagesActionType,
  scheduleP2PNotifsActionType,
} from '../types/dm-ops.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { BaseAction } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { values } from '../utils/objects.js';

function reduceDBOpsStore(store: DBOpsStore, action: BaseAction): DBOpsStore {
  if (action.type === opsProcessingFinishedActionType) {
    const [, ...rest] = store.queuedOps;
    return {
      ...store,
      queuedOps: rest,
    };
  } else if (action.type === scheduleP2PMessagesActionType) {
    const newEntry = {
      ops: {
        outboundP2PMessages: action.payload.messages,
      },
      dmOpID: action.payload.dmOpID,
    };

    return {
      ...store,
      queuedOps: [...store.queuedOps, newEntry],
    };
  } else if (action.type === scheduleP2PNotifsActionType) {
    const newEntry = {
      notificationsCreationData: action.payload.notificationsCreationData,
    };
    return {
      ...store,
      queuedOps: [...store.queuedOps, newEntry],
    };
  }
  return store;
}

function getMessageSearchStoreOps(
  messageStoreOps: ?$ReadOnlyArray<MessageStoreOperation>,
): $ReadOnlyArray<MessageSearchStoreOperation> {
  if (!messageStoreOps) {
    return [];
  }
  const messageSearchStoreOps: MessageSearchStoreOperation[] = [];
  for (const messageOp of messageStoreOps) {
    if (messageOp.type === 'replace') {
      // We only create search index for thick threads,
      // and for non-local messages
      const { messageInfo } = messageOp.payload;
      if (
        extractKeyserverIDFromIDOptional(messageInfo.threadID) ||
        !messageInfo.id
      ) {
        continue;
      }

      if (messageInfo.type === messageTypes.TEXT) {
        messageSearchStoreOps.push({
          type: 'update_search_messages',
          payload: {
            originalMessageID: messageInfo.id,
            messageID: messageInfo.id,
            content: messageInfo.text,
          },
        });
      } else if (messageInfo.type === messageTypes.EDIT_MESSAGE) {
        messageSearchStoreOps.push({
          type: 'update_search_messages',
          payload: {
            originalMessageID: messageInfo.targetMessageID,
            messageID: messageInfo.id,
            content: messageInfo.text,
          },
        });
      }
    }
  }
  return messageSearchStoreOps;
}

function queueDBOps(
  store: DBOpsStore,
  messageSourceMetadata: ?MessageSourceMetadata,
  inputOps: StoreOperations,
): DBOpsStore {
  const areNewOpsPresent = values(inputOps).some(
    opsArray => opsArray.length > 0,
  );
  let newEntry = null;

  const { messageStoreOperations } = inputOps;
  const messageSearchStoreOperations = getMessageSearchStoreOps(
    messageStoreOperations,
  );

  const ops = {
    ...inputOps,
    messageSearchStoreOperations,
  };

  if (messageSourceMetadata && areNewOpsPresent) {
    newEntry = {
      messageSourceMetadata,
      ops,
    };
  } else if (areNewOpsPresent) {
    newEntry = {
      ops,
    };
  } else if (messageSourceMetadata) {
    newEntry = {
      messageSourceMetadata,
    };
  }

  if (!newEntry) {
    return store;
  }

  return {
    ...store,
    queuedOps: [...store.queuedOps, newEntry],
  };
}

export { reduceDBOpsStore, queueDBOps, getMessageSearchStoreOps };
