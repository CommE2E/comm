// @flow

import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import type {
  LocalMessageInfo,
  MultimediaMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import type { TextMessageInfo } from 'lib/types/messages/text';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { EntityText } from 'lib/utils/entity-text';

import type { MessagePendingUploads } from '../input/input-state';

export type ChatRobotextMessageInfoItemWithHeight = {
  +itemType: 'message',
  +messageShapeType: 'robotext',
  +messageInfo: RobotextMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +robotext: string | EntityText,
  +threadCreatedFromMessage: ?ThreadInfo,
  +contentHeight: number,
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
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
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
};

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
  +reactions: $ReadOnlyMap<string, MessageReactionInfo>,
};

export type ChatMessageInfoItemWithHeight =
  | ChatRobotextMessageInfoItemWithHeight
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

export type ChatMessageItemWithHeight =
  | { itemType: 'loader' }
  | ChatMessageInfoItemWithHeight;
