// @flow

import invariant from 'invariant';
import * as React from 'react';

import type { ChatMessageItem } from 'lib/selectors/chat-selectors.js';
import { messageID } from 'lib/shared/message-utils.js';
import { messageTypes, type MessageType } from 'lib/types/message-types.js';
import { entityTextToRawString } from 'lib/utils/entity-text.js';

import type { MeasurementTask } from './chat-context-provider.react.js';
import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { dummyNodeForRobotextMessageHeightMeasurement } from './inner-robotext-message.react.js';
import { dummyNodeForTextMessageHeightMeasurement } from './inner-text-message.react.js';
import { MessageListContextProvider } from './message-list-types.js';
import { multimediaMessageContentSizes } from './multimedia-message-utils.js';
import { chatMessageItemKey } from './utils.js';
import NodeHeightMeasurer from '../components/node-height-measurer.react.js';
import { InputStateContext } from '../input/input-state.js';

type Props = {
  +measurement: MeasurementTask,
};

const heightMeasurerKey = (item: ChatMessageItem) => {
  if (item.itemType !== 'message') {
    return null;
  }
  const { messageInfo } = item;
  if (messageInfo.type === messageTypes.TEXT) {
    return JSON.stringify({ text: messageInfo.text });
  } else if (item.robotext) {
    const { threadID } = item.messageInfo;
    return JSON.stringify({
      robotext: entityTextToRawString(item.robotext, { threadID }),
    });
  }
  return null;
};

const heightMeasurerDummy = (item: ChatMessageItem) => {
  invariant(
    item.itemType === 'message',
    'NodeHeightMeasurer asked for dummy for non-message item',
  );
  const { messageInfo } = item;
  if (messageInfo.type === messageTypes.TEXT) {
    return dummyNodeForTextMessageHeightMeasurement(messageInfo.text);
  } else if (item.robotext) {
    return dummyNodeForRobotextMessageHeightMeasurement(
      item.robotext,
      item.messageInfo.threadID,
    );
  }
  invariant(false, 'NodeHeightMeasurer asked for dummy for non-text message');
};

function ChatItemHeightMeasurer(props: Props) {
  const composedMessageMaxWidth = useComposedMessageMaxWidth();
  const inputState = React.useContext(InputStateContext);
  const inputStatePendingUploads = inputState?.pendingUploads;

  const { measurement } = props;
  const { threadInfo } = measurement;
  const heightMeasurerMergeItem = React.useCallback(
    (item: ChatMessageItem, height: ?number) => {
      if (item.itemType !== 'message') {
        return item;
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
        };
      }
      invariant(
        item.messageInfoType !== 'composable',
        'ChatItemHeightMeasurer was handed a messageInfoType=composable, but ' +
          `does not know how to handle MessageType ${messageInfo.type}`,
      );
      invariant(
        item.messageInfoType === 'robotext',
        'ChatItemHeightMeasurer was handed a messageInfoType that it does ' +
          `not recognize: ${item.messageInfoType}`,
      );
      return {
        itemType: 'message',
        messageShapeType: 'robotext',
        messageInfo,
        threadInfo,
        startsConversation: item.startsConversation,
        startsCluster: item.startsCluster,
        endsCluster: item.endsCluster,
        threadCreatedFromMessage: item.threadCreatedFromMessage,
        robotext: item.robotext,
        contentHeight: height,
        reactions: item.reactions,
      };
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
