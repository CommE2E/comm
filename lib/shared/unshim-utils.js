// @flow

import _mapValues from 'lodash/fp/mapValues.js';

import { messageSpecs } from './messages/message-specs.js';
import {
  type MessageStore,
  type RawMessageInfo,
  type MessageType,
  messageTypes,
} from '../types/message-types.js';

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
  messageTypes.UPDATE_RELATIONSHIP,
  messageTypes.CREATE_SIDEBAR,
  messageTypes.SIDEBAR_SOURCE,
  messageTypes.MULTIMEDIA,
  messageTypes.REACTION,
  messageTypes.TOGGLE_PIN,
  messageTypes.EDIT_MESSAGE,
]);
function unshimMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  return messageInfos.map((messageInfo: RawMessageInfo) =>
    unshimFunc(messageInfo, localUnshimTypes),
  );
}

export { DEPRECATED_unshimMessageStore, unshimMessageInfos, unshimFunc };
