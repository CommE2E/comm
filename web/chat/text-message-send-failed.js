// @flow

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

export default function textMessageSendFailed(
  item: ChatMessageInfoItem,
): boolean {
  const {
    id,
    creator: { isViewer },
    type,
  } = item.messageInfo;
  return !!(
    isViewer &&
    type === messageTypes.TEXT &&
    (id === null || id === undefined) &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  );
}
