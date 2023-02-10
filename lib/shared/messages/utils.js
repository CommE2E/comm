// @flow

import type { MessageInfo } from '../../types/message-types.js';

export function assertSingleMessageInfo(
  messageInfos: $ReadOnlyArray<MessageInfo>,
): MessageInfo {
  if (messageInfos.length === 0) {
    throw new Error('expected single MessageInfo, but none present!');
  } else if (messageInfos.length !== 1) {
    const messageIDs = messageInfos.map(messageInfo => messageInfo.id);
    console.log(
      'expected single MessageInfo, but there are multiple! ' +
        messageIDs.join(', '),
    );
  }
  return messageInfos[0];
}

export const joinResult = (...keys: $ReadOnlyArray<string | number>): string =>
  keys.join('|');
