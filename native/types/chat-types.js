// @flow

import type {
  LocalMessageInfo,
  MultimediaMessageInfo,
  ReactionMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import type { TextMessageInfo } from 'lib/types/messages/text';
import type { ThreadInfo } from 'lib/types/thread-types';

import type { MessagePendingUploads } from '../input/input-state';

export type ChatRobotextMessageInfoItemWithHeight = {
  +itemType: 'message',
  +messageShapeType: 'robotext',
  +messageInfo: RobotextMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +robotext: string,
  +threadCreatedFromMessage: ?ThreadInfo,
  +contentHeight: number,
  +reactions?: $ReadOnlyArray<ReactionMessageInfo>,
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
  +reactions?: $ReadOnlyArray<ReactionMessageInfo>,
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
  +reactions?: $ReadOnlyArray<ReactionMessageInfo>,
};

export type ChatMessageInfoItemWithHeight =
  | ChatRobotextMessageInfoItemWithHeight
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

export type ChatMessageItemWithHeight =
  | { itemType: 'loader' }
  | ChatMessageInfoItemWithHeight;
