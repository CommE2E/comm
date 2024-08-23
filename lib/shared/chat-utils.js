// @flow

import type { LocalMessageInfo } from '../types/message-types.js';
import type { TextMessageInfo } from '../types/messages/text.js';

function textMessageSendFailed(
  messageInfo: TextMessageInfo,
  localMessageInfo: ?LocalMessageInfo,
): boolean {
  const {
    id,
    creator: { isViewer },
  } = messageInfo;

  if (!isViewer || !localMessageInfo || !localMessageInfo.sendFailed) {
    return false;
  }

  if (
    localMessageInfo.outboundP2PMessageIDs &&
    localMessageInfo.outboundP2PMessageIDs.length > 0
  ) {
    // DM message
    return true;
  } else if (id === null || id === undefined) {
    return true;
  }

  return false;
}

export { textMessageSendFailed };
