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
type BaseChatMessageInfoItem =
  | {
      +itemType: 'message',
      +messageInfo: ChatMessageItemMessageInfo,
      +messageInfos?: ?void,
      ...
    }
  | {
      +itemType: 'message',
      +messageInfos: $ReadOnlyArray<ChatMessageItemMessageInfo>,
      +messageInfo?: ?void,
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
  if (item.messageInfo) {
    return messageKey(item.messageInfo);
  }
  return item.messageInfos.map(messageKey).join('^');
}

function chatMessageInfoItemTimestamp(item: BaseChatMessageInfoItem): string {
  // If there's an array of messageInfos, we expect at least one,
  // and the most recent should be first
  const messageInfo = item.messageInfo
    ? item.messageInfo
    : item.messageInfos[0];
  return longAbsoluteDate(messageInfo.time);
}

// If the ChatMessageInfoItem can be the target of operations like sidebar
// creation, reaction, or pinning, then this function returns the RawMessageInfo
// that would be the target. Currently, the only reason that a
// ChatMessageInfoItem can't be such a target would be if it's a combined
// RobotextChatMessageInfoItem that has multiple messageInfos.
function chatMessageItemEngagementTargetMessageInfo(
  item: BaseChatMessageInfoItem,
): ?ComposableMessageInfo | RobotextMessageInfo {
  if (item.messageInfo) {
    return item.messageInfo;
  } else if (item.messageInfos && item.messageInfos.length === 1) {
    return item.messageInfos[0];
  }
  return null;
}

function chatMessageItemHasNonViewerMessage(
  item: BaseChatMessageItem,
  viewerID: ?string,
): boolean {
  if (item.messageInfo) {
    return item.messageInfo.creator.id !== viewerID;
  } else if (item.messageInfos) {
    return item.messageInfos.some(
      messageInfo => messageInfo.creator.id !== viewerID,
    );
  }
  return false;
}

type BaseChatMessageItemForEngagementCheck = {
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
  +hasBeenEdited?: ?boolean,
  +deleted?: ?boolean,
  ...
};
function chatMessageItemHasEngagement(
  item: BaseChatMessageItemForEngagementCheck,
  threadID: string,
): boolean {
  const label = getMessageLabel(item.hasBeenEdited, threadID);
  return (
    !!item.threadCreatedFromMessage ||
    (!item.deleted && (!!label || Object.keys(item.reactions).length > 0))
  );
}

export {
  chatMessageItemKey,
  chatMessageInfoItemTimestamp,
  chatMessageItemEngagementTargetMessageInfo,
  chatMessageItemHasNonViewerMessage,
  chatMessageItemHasEngagement,
};
