// @flow

import {
  type MessageStore,
  type RawMessageInfo,
  type MessageType,
  messageTypes,
} from '../types/message-types';

import _mapValues from 'lodash/fp/mapValues';
import invariant from 'invariant';

// Four photos were uploaded before dimensions were calculated server-side,
// and delivered to clients without dimensions in the MultimediaMessageInfo.
const preDimensionUploads = {
  '156642': { width: 1440, height: 1080 },
  '156649': { width: 720, height: 803 },
  '156794': { width: 720, height: 803 },
  '156877': { width: 574, height: 454 },
};

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
  if (unwrapped.type === messageTypes.IMAGES) {
    return {
      ...unwrapped,
      media: unwrapped.media.map(media => {
        if (media.dimensions) {
          return media;
        }
        const dimensions = preDimensionUploads[media.id];
        invariant(
          dimensions,
          'only four photos were uploaded before dimensions were calculated, ' +
            `and ${media.id} was not one of them`,
        );
        return { ...media, dimensions };
      }),
    };
  }
  if (unwrapped.type === messageTypes.MULTIMEDIA) {
    for (let { type } of unwrapped.media) {
      if (type !== 'photo' && type !== 'video') {
        return messageInfo;
      }
    }
  }
  return unwrapped;
}

function unshimMessageStore(
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
  messageTypes.MULTIMEDIA,
]);
function unshimMessageInfos(
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawMessageInfo[] {
  return messageInfos.map((messageInfo: RawMessageInfo) =>
    unshimFunc(messageInfo, localUnshimTypes),
  );
}

export { unshimMessageStore, unshimMessageInfos };
