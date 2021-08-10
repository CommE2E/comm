// @flow

import type { ChatTextMessageInfoItemWithHeight } from '../types/chat-types';

export default function textMessageSendFailed(
  item: ChatTextMessageInfoItemWithHeight,
): boolean {
  const {
    id,
    creator: { isViewer },
  } = item.messageInfo;
  return !!(
    isViewer &&
    (id === null || id === undefined) &&
    item.localMessageInfo &&
    item.localMessageInfo.sendFailed
  );
}
