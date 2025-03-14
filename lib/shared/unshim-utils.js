// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import { messageSpecs } from './messages/message-specs.js';
import {
  type ClientDBDMOperation,
  convertClientDBDMOperationToDMOperation,
} from '../ops/dm-operations-store-ops.js';
import { type DMOperationType } from '../types/dm-ops.js';
import { type MessageType, messageTypes } from '../types/message-types-enum.js';
import {
  type MessageStore,
  type RawMessageInfo,
} from '../types/message-types.js';
import type { BaseNavInfo } from '../types/nav-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import { getConfig } from '../utils/config.js';
import type { MigrationResult } from '../utils/migration-utils.js';

function unshimFunc(
  messageInfo: RawMessageInfo,
  unshimTypes: Set<MessageType>,
): RawMessageInfo {
  if (messageInfo.type !== messageTypes.UNSUPPORTED) {
    return messageInfo;
  }
  if (!unshimTypes.has(messageInfo.unsupportedMessageInfo.type)) {
    return messageInfo;
  }
  const unwrapped = messageInfo.unsupportedMessageInfo;
  const { unshimMessageInfo } = messageSpecs[unwrapped.type];
  const unshimmed = unshimMessageInfo?.(unwrapped, messageInfo);
  return unshimmed ?? unwrapped;
}

function DEPRECATED_unshimMessageStore(
  messageStore: MessageStore,
  unshimTypes: $ReadOnlyArray<MessageType>,
): MessageStore {
  const set = new Set(unshimTypes);
  const messages = _mapValues((messageInfo: RawMessageInfo) =>
    unshimFunc(messageInfo, set),
  )(messageStore.messages);
  return { ...messageStore, messages };
}

const localUnshimTypes = new Set([
  messageTypes.IMAGES,
  messageTypes.LEGACY_UPDATE_RELATIONSHIP,
  messageTypes.CREATE_SIDEBAR,
  messageTypes.SIDEBAR_SOURCE,
  messageTypes.MULTIMEDIA,
  messageTypes.REACTION,
  messageTypes.TOGGLE_PIN,
  messageTypes.EDIT_MESSAGE,
  messageTypes.UPDATE_RELATIONSHIP,
]);
function unshimMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  return messageInfos.map((messageInfo: RawMessageInfo) =>
    unshimFunc(messageInfo, localUnshimTypes),
  );
}

async function unshimDMOperations<N: BaseNavInfo, T: BaseAppState<N>>(
  state: T,
  type: DMOperationType,
  handleMigrationFailure: T => T,
): Promise<MigrationResult<T>> {
  const { fetchDMOperationsByType } = getConfig().sqliteAPI;
  try {
    const operations: Array<ClientDBDMOperation> =
      await fetchDMOperationsByType(type);
    if (operations.length === 0) {
      return {
        state,
        ops: {},
      };
    }

    const shimmedOperations = operations
      .map(convertClientDBDMOperationToDMOperation)
      .map(op => ({
        id: op.id,
        operation: op.operation,
      }));

    return {
      state: {
        ...state,
        queuedDMOperations: {
          ...state.queuedDMOperations,
          shimmedOperations,
        },
      },
      ops: {},
    };
  } catch (e) {
    console.log(e);
    const newState = handleMigrationFailure(state);
    return { state: newState, ops: {} };
  }
}

export {
  DEPRECATED_unshimMessageStore,
  unshimMessageInfos,
  unshimFunc,
  unshimDMOperations,
};
