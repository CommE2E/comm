// @flow

import invariant from 'invariant';
import * as React from 'react';
import Animated from 'react-native-reanimated';

import { useMessageListData } from 'lib/selectors/chat-selectors';
import { messageKey } from 'lib/shared/message-utils';
import { colorIsDark } from 'lib/shared/thread-utils';

import { useSelector } from '../redux/redux-utils';
import type {
  ChatMessageInfoItemWithHeight,
  ChatMessageItemWithHeight,
  ChatRobotextMessageInfoItemWithHeight,
  ChatTextMessageInfoItemWithHeight,
} from '../types/chat-types';
import type { LayoutCoordinates, VerticalBounds } from '../types/layout-types';
import type { AnimatedViewStyle } from '../types/styles';
import { ChatContext, useHeightMeasurer } from './chat-context';
import { clusterEndHeight } from './composed-message.react';
import { failedSendHeight } from './failed-send.react';
import {
  inlineSidebarHeight,
  inlineSidebarMarginBottom,
  inlineSidebarMarginTop,
} from './inline-sidebar.react';
import { authorNameHeight } from './message-header.react';
import { multimediaMessageItemHeight } from './multimedia-message-utils';
import { getSidebarThreadInfo } from './sidebar-navigation';
import textMessageSendFailed from './text-message-send-failed';
import { timestampHeight } from './timestamp.react';

/* eslint-disable import/no-named-as-default-member */
const {
  Node,
  Extrapolate,
  interpolateNode,
  interpolateColors,
  block,
  call,
  eq,
  cond,
} = Animated;
/* eslint-enable import/no-named-as-default-member */

function textMessageItemHeight(
  item: ChatTextMessageInfoItemWithHeight,
): number {
  const { messageInfo, contentHeight, startsCluster, endsCluster } = item;
  const { isViewer } = messageInfo.creator;
  let height = 5 + contentHeight; // 5 from marginBottom in ComposedMessage
  if (!isViewer && startsCluster) {
    height += authorNameHeight;
  }
  if (endsCluster) {
    height += clusterEndHeight;
  }
  if (textMessageSendFailed(item)) {
    height += failedSendHeight;
  }
  if (item.threadCreatedFromMessage) {
    height +=
      inlineSidebarHeight + inlineSidebarMarginTop + inlineSidebarMarginBottom;
  }
  return height;
}

function robotextMessageItemHeight(
  item: ChatRobotextMessageInfoItemWithHeight,
): number {
  if (item.threadCreatedFromMessage) {
    return item.contentHeight + inlineSidebarHeight;
  }
  return item.contentHeight;
}

function messageItemHeight(item: ChatMessageInfoItemWithHeight): number {
  let height = 0;
  if (item.messageShapeType === 'text') {
    height += textMessageItemHeight(item);
  } else if (item.messageShapeType === 'multimedia') {
    height += multimediaMessageItemHeight(item);
  } else {
    height += robotextMessageItemHeight(item);
  }
  if (item.startsConversation) {
    height += timestampHeight;
  }
  return height;
}

function chatMessageItemHeight(item: ChatMessageItemWithHeight): number {
  if (item.itemType === 'loader') {
    return 56;
  }
  return messageItemHeight(item);
}

function useMessageTargetParameters(
  sourceMessage: ChatMessageInfoItemWithHeight,
  initialCoordinates: LayoutCoordinates,
  messageListVerticalBounds: VerticalBounds,
): {
  +position: number,
  +color: string,
} {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const sidebarThreadInfo = React.useMemo(() => {
    return getSidebarThreadInfo(sourceMessage, viewerID);
  }, [sourceMessage, viewerID]);

  const messageListData = useMessageListData({
    searching: false,
    userInfoInputArray: [],
    threadInfo: sidebarThreadInfo,
  });

  const [
    messagesWithHeight,
    setMessagesWithHeight,
  ] = React.useState<?$ReadOnlyArray<ChatMessageItemWithHeight>>(null);
  const measureMessages = useHeightMeasurer();

  React.useEffect(() => {
    if (messageListData) {
      measureMessages(
        messageListData,
        sidebarThreadInfo,
        setMessagesWithHeight,
      );
    }
  }, [measureMessages, messageListData, sidebarThreadInfo]);

  const sourceMessageID = sourceMessage.messageInfo?.id;
  const targetDistanceFromBottom = React.useMemo(() => {
    if (!messagesWithHeight) {
      return 0;
    }

    let offset = 0;
    for (const message of messagesWithHeight) {
      offset += chatMessageItemHeight(message);
      if (message.messageInfo && message.messageInfo.id === sourceMessageID) {
        return offset;
      }
    }

    return (
      messageListVerticalBounds.height + chatMessageItemHeight(sourceMessage)
    );
  }, [
    messageListVerticalBounds.height,
    messagesWithHeight,
    sourceMessage,
    sourceMessageID,
  ]);

  const authorNameComponentHeight = sourceMessage.messageInfo.creator.isViewer
    ? 0
    : authorNameHeight;
  const currentDistanceFromBottom =
    messageListVerticalBounds.height +
    messageListVerticalBounds.y -
    initialCoordinates.y +
    timestampHeight +
    authorNameComponentHeight;
  return {
    position: targetDistanceFromBottom - currentDistanceFromBottom,
    color: sidebarThreadInfo.color,
  };
}

function useAnimatedMessageTooltipButton(
  sourceMessage: ChatMessageInfoItemWithHeight,
  initialCoordinates: LayoutCoordinates,
  messageListVerticalBounds: VerticalBounds,
  progress: Node,
): {
  +style: AnimatedViewStyle,
  +threadColorOverride: ?Node,
  +isThreadColorDarkOverride: ?boolean,
  +isAnimatingToSidebar: boolean,
} {
  const {
    position: targetPosition,
    color: targetColor,
  } = useMessageTargetParameters(
    sourceMessage,
    initialCoordinates,
    messageListVerticalBounds,
  );

  const chatContext = React.useContext(ChatContext);
  invariant(chatContext, 'chatContext should be set');
  const {
    currentTransitionSidebarSourceID,
    setCurrentTransitionSidebarSourceID,
  } = chatContext;

  React.useEffect(() => {
    return () => setCurrentTransitionSidebarSourceID(null);
  }, [setCurrentTransitionSidebarSourceID]);

  const bottom = React.useMemo(
    () =>
      interpolateNode(progress, {
        inputRange: [0.3, 1],
        outputRange: [targetPosition, 0],
        extrapolate: Extrapolate.CLAMP,
      }),
    [progress, targetPosition],
  );

  const [
    isThreadColorDarkOverride,
    setThreadColorDarkOverride,
  ] = React.useState<?boolean>(null);
  const setThreadColorBrightness = React.useCallback(() => {
    const isSourceThreadDark = colorIsDark(sourceMessage.threadInfo.color);
    const isTargetThreadDark = colorIsDark(targetColor);
    if (isSourceThreadDark !== isTargetThreadDark) {
      setThreadColorDarkOverride(isTargetThreadDark);
    }
  }, [sourceMessage.threadInfo.color, targetColor]);

  const threadColorOverride = React.useMemo(() => {
    if (
      sourceMessage.messageShapeType !== 'text' ||
      !currentTransitionSidebarSourceID
    ) {
      return null;
    }
    return block([
      cond(eq(progress, 1), call([], setThreadColorBrightness)),
      interpolateColors(progress, {
        inputRange: [0, 1],
        outputColorRange: [
          `#${targetColor}`,
          `#${sourceMessage.threadInfo.color}`,
        ],
      }),
    ]);
  }, [
    currentTransitionSidebarSourceID,
    progress,
    setThreadColorBrightness,
    sourceMessage.messageShapeType,
    sourceMessage.threadInfo.color,
    targetColor,
  ]);

  const messageContainerStyle = React.useMemo(() => {
    return {
      bottom: currentTransitionSidebarSourceID ? bottom : 0,
    };
  }, [bottom, currentTransitionSidebarSourceID]);

  return {
    style: messageContainerStyle,
    threadColorOverride,
    isThreadColorDarkOverride,
    isAnimatingToSidebar: !!currentTransitionSidebarSourceID,
  };
}

function getMessageTooltipKey(item: ChatMessageInfoItemWithHeight): string {
  return `tooltip|${messageKey(item.messageInfo)}`;
}

export {
  getSidebarThreadInfo,
  chatMessageItemHeight,
  useAnimatedMessageTooltipButton,
  messageItemHeight,
  getMessageTooltipKey,
};
