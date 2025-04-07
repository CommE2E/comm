// @flow

import { opsProcessingFinishedActionType } from '../actions/db-ops-actions.js';
import { extractKeyserverIDFromIDOptional } from '../keyserver-conn/keyserver-call-utils.js';
import type { MessageSearchStoreOperation } from '../message-search-types.js';
import type { MessageStoreOperation } from '../ops/message-store-ops.js';
import type { DBOpsStore } from '../types/db-ops-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { NotificationsCreationData } from '../types/notif-types.js';
import type { BaseAction, DispatchMetadata } from '../types/redux-types.js';
import type { StoreOperations } from '../types/store-ops-types.js';
import { values } from '../utils/objects.js';

function reduceDBOpsStore(store: DBOpsStore, action: BaseAction): DBOpsStore {
  if (action.type === opsProcessingFinishedActionType) {
    const [, ...rest] = store.queuedOps;
    return {
      ...store,
      queuedOps: rest,
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
      } else if (messageInfo.type === messageTypes.DELETE_MESSAGE) {
        messageSearchStoreOps.push({
          type: 'delete_search_message',
          payload: {
            messageID: messageInfo.targetMessageID,
          },
        });
      }
    }
  }
  return messageSearchStoreOps;
}

function queueDBOps(
  store: DBOpsStore,
  dispatchMetadata: ?DispatchMetadata,
  inputOps: StoreOperations,
  notificationsCreationData: ?NotificationsCreationData,
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

  if (dispatchMetadata && areNewOpsPresent && notificationsCreationData) {
    newEntry = {
      dispatchMetadata,
      ops,
      notificationsCreationData,
    };
  } else if (dispatchMetadata && areNewOpsPresent) {
    newEntry = {
      dispatchMetadata,
      ops,
    };
  } else if (areNewOpsPresent) {
    newEntry = {
      ops,
    };
  } else if (dispatchMetadata) {
    newEntry = { dispatchMetadata };
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
