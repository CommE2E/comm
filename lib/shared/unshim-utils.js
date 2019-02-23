// @flow

import {
  type MessageStore,
  type RawMessageInfo,
  type MessageType,
  messageTypes,
} from '../types/message-types';

import _mapValues from 'lodash/fp/mapValues';

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
  return messageInfo.unsupportedMessageInfo;
}

function unshimMessageStore(
  messageStore: MessageStore,
  unshimTypes: $ReadOnlyArray<MessageType>,
): MessageStore {
  const set = new Set(unshimTypes);
  const messages = _mapValues(
    (messageInfo: RawMessageInfo) => unshimFunc(messageInfo, set),
  )(messageStore.messages);
  return { ...messageStore, messages };
}

const localUnshimTypes = new Set([
  messageTypes.MULTIMEDIA,
]);
function unshimMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  return messageInfos.map(
    (messageInfo: RawMessageInfo) => unshimFunc(messageInfo, localUnshimTypes),
  );
}

export {
  unshimMessageStore,
  unshimMessageInfos,
};
