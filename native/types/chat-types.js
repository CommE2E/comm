// @flow

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import type {
  LocalMessageInfo,
  MultimediaMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types.js';
import type { TextMessageInfo } from 'lib/types/messages/text.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { EntityText } from 'lib/utils/entity-text.js';

import type { MessagePendingUploads } from '../input/input-state.js';

export type ChatRobotextMessageInfoItemWithHeight = {
  +itemType: 'message',
  +messageShapeType: 'robotext',
  +messageInfo: RobotextMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +robotext: EntityText,
  +threadCreatedFromMessage: ?ThreadInfo,
  +contentHeight: number,
  +reactions: ReactionInfo,
};

export type ChatTextMessageInfoItemWithHeight = {
  +itemType: 'message',
  +messageShapeType: 'text',
  +messageInfo: TextMessageInfo,
  +localMessageInfo: ?LocalMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +contentHeight: number,
  +threadCreatedFromMessage: ?ThreadInfo,
  +reactions: ReactionInfo,
  +hasBeenEdited: ?boolean,
  +isPinned: ?boolean,
};

// We "measure" the contentHeight of a multimedia message using the media
// dimensions. This means for multimedia messages we only need to actually
// measure the inline engagement node
export type MultimediaContentSizes = {
  +imageHeight: number,
  +contentHeight: number,
  +contentWidth: number,
};
export type ChatMultimediaMessageInfoItem = {
  ...MultimediaContentSizes,
  +itemType: 'message',
  +messageShapeType: 'multimedia',
  +messageInfo: MultimediaMessageInfo,
  +localMessageInfo: ?LocalMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +threadCreatedFromMessage: ?ThreadInfo,
  +pendingUploads: ?MessagePendingUploads,
  +reactions: ReactionInfo,
  +hasBeenEdited: ?boolean,
  +isPinned: ?boolean,
  +inlineEngagementHeight: ?number,
};

export type ChatComposedMessageInfoItemWithHeight =
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

export type ChatMessageInfoItemWithHeight =
  | ChatRobotextMessageInfoItemWithHeight
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

export type ChatMessageItemWithHeight =
  | { itemType: 'loader' }
  | ChatMessageInfoItemWithHeight;
