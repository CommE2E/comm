// @flow

import { messageKey } from './message-utils.js';
import type { ReactionInfo } from '../selectors/chat-selectors.js';
import { getMessageLabel } from '../shared/edit-messages-utils.js';
import type {
  RobotextMessageInfo,
  ComposableMessageInfo,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { longAbsoluteDate } from '../utils/date-utils.js';

type ChatMessageItemMessageInfo = ComposableMessageInfo | RobotextMessageInfo;

// This complicated type matches both ChatMessageItem and
// ChatMessageItemWithHeight, and is a disjoint union of types
type BaseChatMessageInfoItem = {
  +itemType: 'message',
  +messageInfo: ChatMessageItemMessageInfo,
  +messageInfos?: ?void,
  ...
};
type BaseChatMessageItem =
  | BaseChatMessageInfoItem
  | {
      +itemType: 'loader',
      +messageInfo?: ?void,
      +messageInfos?: ?void,
      ...
    };

function chatMessageItemKey(item: BaseChatMessageItem): string {
  if (item.itemType === 'loader') {
    return 'loader';
  }
  return messageKey(item.messageInfo);
}

function chatMessageInfoItemTimestamp(item: BaseChatMessageInfoItem): string {
  return longAbsoluteDate(item.messageInfo.time);
}

function chatMessageItemEngagementTargetMessageInfo(
  item: BaseChatMessageInfoItem,
): ComposableMessageInfo | RobotextMessageInfo {
  return item.messageInfo;
}

function chatMessageItemHasNonViewerMessage(
  item: BaseChatMessageItem,
  viewerID: ?string,
): boolean {
  return (
    item.itemType === 'message' && item.messageInfo.creator.id !== viewerID
  );
}

type BaseChatMessageItemForEngagementCheck = {
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
  +hasBeenEdited?: ?boolean,
  ...
};
function chatMessageItemHasEngagement(
  item: BaseChatMessageItemForEngagementCheck,
  threadID: string,
): boolean {
  const label = getMessageLabel(item.hasBeenEdited, threadID);
  return (
    !!label ||
    !!item.threadCreatedFromMessage ||
    Object.keys(item.reactions).length > 0
  );
}

export {
  chatMessageItemKey,
  chatMessageInfoItemTimestamp,
  chatMessageItemEngagementTargetMessageInfo,
  chatMessageItemHasNonViewerMessage,
  chatMessageItemHasEngagement,
};
