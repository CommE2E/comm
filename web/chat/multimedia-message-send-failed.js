// @flow

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { ChatInputState } from './chat-input-state';

import invariant from 'invariant';

export default function multimediaMessageSendFailed(
  item: ChatMessageInfoItem,
  chatInputState: ChatInputState,
) {
  const { messageInfo } = item;
  if (
    !messageInfo.creator.isViewer ||
    (messageInfo.type !== messageTypes.MULTIMEDIA &&
      messageInfo.type !== messageTypes.IMAGES)
  ) {
    return false;
  }
  const { id, localID } = messageInfo;
  if (id !== null && id !== undefined) {
    return false;
  }
  invariant(localID, 'localID should be set if serverID is not');
  return !!(
    chatInputState.messageHasUploadFailure(localID) ||
    (item.localMessageInfo && item.localMessageInfo.sendFailed)
  );
}
