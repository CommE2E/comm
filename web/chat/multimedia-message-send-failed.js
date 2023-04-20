// @flow

import invariant from 'invariant';

import type { ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

import type { InputState } from '../input/input-state.js';

export default function multimediaMessageSendFailed(
  item: ChatMessageInfoItem,
  inputState: InputState,
): boolean {
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
    inputState.messageHasUploadFailure(localID) ||
    (item.localMessageInfo && item.localMessageInfo.sendFailed)
  );
}
