// @flow

import invariant from 'invariant';
import * as React from 'react';
import Animated from 'react-native-reanimated';

import { useMessageListData } from 'lib/selectors/chat-selectors';
import { colorIsDark } from 'lib/shared/thread-utils';

import { useSelector } from '../redux/redux-utils';
import type {
  ChatMessageInfoItemWithHeight,
  ChatMessageItemWithHeight,
} from '../types/chat-types';
import type { LayoutCoordinates, VerticalBounds } from '../types/layout-types';
import type { AnimatedViewStyle } from '../types/styles';
import { ChatContext, useHeightMeasurer } from './chat-context';
import { authorNameHeight } from './message-header.react';
import { messageItemHeight } from './message.react';
import { getSidebarThreadInfo } from './sidebar-navigation';
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
        inputRange: [0, 1],
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

export {
  getSidebarThreadInfo,
  chatMessageItemHeight,
  useAnimatedMessageTooltipButton,
};
