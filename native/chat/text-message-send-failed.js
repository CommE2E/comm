// @flow

import { textMessageSendFailed as sharedTextMessageSendFailed } from 'lib/shared/chat-utils.js';

import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types.js';

export default function textMessageSendFailed(
  item: ChatTextMessageInfoItemWithHeight,
): boolean {
  const { messageInfo, localMessageInfo } = item;
  return sharedTextMessageSendFailed(messageInfo, localMessageInfo);
}
