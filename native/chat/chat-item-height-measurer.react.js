// @flow

import invariant from 'invariant';
import * as React from 'react';

import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { getMessageLabel } from 'lib/shared/edit-messages-utils.js';
import {
  getInlineEngagementSidebarText,
  reactionsToRawString,
} from 'lib/shared/inline-engagement-utils.js';
import { messageID } from 'lib/shared/message-utils.js';
import {
  messageTypes,
  type MessageType,
} from 'lib/types/message-types-enum.js';
import { deletedMessageText } from 'lib/utils/delete-message-utils.js';
import { entityTextToRawString } from 'lib/utils/entity-text.js';

import type { MeasurementTask } from './chat-context-provider.react.js';
import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { dummyNodeForInlineEngagementHeightMeasurement } from './inline-engagement.react.js';
import { dummyNodeForRobotextMessageHeightMeasurement } from './inner-robotext-message.react.js';
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react.js';
import type { NativeChatMessageItem } from './message-data.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import { multimediaMessageContentSizes } from './multimedia-message-utils.js';
import NodeHeightMeasurer from '../components/node-height-measurer.react.js';
import { InputStateContext } from '../input/input-state.js';

type Props = {
  +measurement: MeasurementTask,
};

const heightMeasurerKey = (item: NativeChatMessageItem) => {
  if (item.itemType !== 'message') {
    return null;
  }
  const {
    messageInfo,
    hasBeenEdited,
    threadCreatedFromMessage,
    reactions,
    deleted,
  } = item;

  if (deleted) {
    return JSON.stringify({
      deleted,
      sidebar: getInlineEngagementSidebarText(threadCreatedFromMessage),
    });
  }

  if (messageInfo && messageInfo.type === messageTypes.TEXT) {
    return JSON.stringify({
      text: messageInfo.text,
      edited: getMessageLabel(hasBeenEdited, messageInfo.threadID),
      sidebar: getInlineEngagementSidebarText(threadCreatedFromMessage),
      reactions: reactionsToRawString(reactions),
    });
  } else if (item.robotext) {
    const { threadID } = item.messageInfos[0];
    return JSON.stringify({
      robotext: entityTextToRawString(item.robotext, { threadID }),
      sidebar: getInlineEngagementSidebarText(threadCreatedFromMessage),
      reactions: reactionsToRawString(reactions),
    });
  } else if (threadCreatedFromMessage || Object.keys(reactions).length > 0) {
    // we enter this condition when the item is a multimedia message with an
    // inline engagement
    return JSON.stringify({
      sidebar: getInlineEngagementSidebarText(threadCreatedFromMessage),
      reactions: reactionsToRawString(reactions),
    });
  }
  return null;
};

// ESLint doesn't recognize that invariant always throws
// eslint-disable-next-line consistent-return
const heightMeasurerDummy = (item: NativeChatMessageItem) => {
  invariant(
    item.itemType === 'message',
    'NodeHeightMeasurer asked for dummy for non-message item',
  );
  const {
    messageInfo,
    hasBeenEdited,
    threadCreatedFromMessage,
    reactions,
    deleted,
  } = item;

  if (deleted) {
    return dummyNodeForTextMessageHeightMeasurement(
      deletedMessageText,
      null,
      threadCreatedFromMessage,
      {},
      true,
    );
  }

  if (messageInfo && messageInfo.type === messageTypes.TEXT) {
    const label = getMessageLabel(hasBeenEdited, messageInfo.threadID);
    return dummyNodeForTextMessageHeightMeasurement(
      messageInfo.text,
      label,
      threadCreatedFromMessage,
      reactions,
      false,
    );
  } else if (item.robotext) {
    return dummyNodeForRobotextMessageHeightMeasurement(
      item.robotext,
      item.messageInfos[0].threadID,
      threadCreatedFromMessage,
      reactions,
    );
  } else if (threadCreatedFromMessage || Object.keys(reactions).length > 0) {
    // we enter this condition when the item is a multimedia message with an
    // inline engagement

    return dummyNodeForInlineEngagementHeightMeasurement(
      threadCreatedFromMessage,
      reactions,
      false,
    );
  }
  invariant(
    false,
    'NodeHeightMeasurer asked for dummy for multimedia message with no inline engagement',
  );
};

function ChatItemHeightMeasurer(props: Props) {
  const composedMessageMaxWidth = useComposedMessageMaxWidth();
  const inputState = React.useContext(InputStateContext);
  const inputStatePendingUploads = inputState?.pendingUploads;

  const { measurement } = props;
  const { threadInfo } = measurement;
  const heightMeasurerMergeItem = React.useCallback(
    (item: NativeChatMessageItem, height: ?number) => {
      if (item.itemType !== 'message') {
        return item;
      }

      if (item.messageInfoType !== 'composable') {
        invariant(
          height !== null && height !== undefined,
          'height should be set',
        );
        return {
          itemType: 'message',
          messageShapeType: 'robotext',
          messageInfos: item.messageInfos,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          threadCreatedFromMessage: item.threadCreatedFromMessage,
          robotext: item.robotext,
          contentHeight: height,
          reactions: item.reactions,
        };
      }

      const { messageInfo } = item;
      const messageType: MessageType = messageInfo.type;
      invariant(
        messageType !== messageTypes.SIDEBAR_SOURCE,
        'Sidebar source messages should be replaced by sourceMessage before being measured',
      );

      if (
        messageInfo.type === messageTypes.IMAGES ||
        messageInfo.type === messageTypes.MULTIMEDIA
      ) {
        // Conditional due to Flow...
        const localMessageInfo = item.localMessageInfo
          ? item.localMessageInfo
          : null;
        const id = messageID(messageInfo);
        const pendingUploads = inputStatePendingUploads?.[id];
        const sizes = multimediaMessageContentSizes(
          messageInfo,
          composedMessageMaxWidth,
        );
        return {
          itemType: 'message',
          messageShapeType: 'multimedia',
          messageInfo,
          localMessageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          threadCreatedFromMessage: item.threadCreatedFromMessage,
          pendingUploads,
          reactions: item.reactions,
          hasBeenEdited: item.hasBeenEdited,
          isPinned: item.isPinned,
          inlineEngagementHeight: height,
          deleted: item.deleted,
          ...sizes,
        };
      }

      invariant(
        height !== null && height !== undefined,
        'height should be set',
      );
      if (messageInfo.type === messageTypes.TEXT) {
        // Conditional due to Flow...
        const localMessageInfo = item.localMessageInfo
          ? item.localMessageInfo
          : null;
        return {
          itemType: 'message',
          messageShapeType: 'text',
          messageInfo,
          localMessageInfo,
          threadInfo,
          startsConversation: item.startsConversation,
          startsCluster: item.startsCluster,
          endsCluster: item.endsCluster,
          threadCreatedFromMessage: item.threadCreatedFromMessage,
          contentHeight: height,
          reactions: item.reactions,
          hasBeenEdited: item.hasBeenEdited,
          isPinned: item.isPinned,
          deleted: item.deleted,
        };
      }

      throw new Error(
        'ChatItemHeightMeasurer was handed a messageInfoType=composable, but ' +
          `does not know how to handle MessageType ${messageInfo.type}`,
      );
    },
    [composedMessageMaxWidth, inputStatePendingUploads, threadInfo],
  );

  return (
    <MessageListContextProvider
      threadInfo={threadInfo}
      key={measurement.measurerID}
    >
      <NodeHeightMeasurer
        listData={measurement.messages}
        itemToID={chatMessageItemKey}
        itemToMeasureKey={heightMeasurerKey}
        itemToDummy={heightMeasurerDummy}
        mergeItemWithHeight={heightMeasurerMergeItem}
        allHeightsMeasured={measurement.onMessagesMeasured}
        inputState={inputState}
        composedMessageMaxWidth={composedMessageMaxWidth}
        initialMeasuredHeights={measurement.initialMeasuredHeights}
      />
    </MessageListContextProvider>
  );
}

const MemoizedChatItemHeightMeasurer: React.ComponentType<Props> =
  React.memo<Props>(ChatItemHeightMeasurer);

export default MemoizedChatItemHeightMeasurer;
