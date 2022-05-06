// @flow

import invariant from 'invariant';
import * as React from 'react';
import Animated from 'react-native-reanimated';

import { useMessageListData } from 'lib/selectors/chat-selectors';
import { messageKey } from 'lib/shared/message-utils';
import { colorIsDark, viewerIsMember } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import { KeyboardContext } from '../keyboard/keyboard-state';
import { OverlayContext } from '../navigation/overlay-context';
import {
  MultimediaMessageTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
} from '../navigation/route-names';
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
import { clusterEndHeight } from './composed-message-constants';
import { failedSendHeight } from './failed-send.react';
import {
  inlineSidebarHeight,
  inlineSidebarMarginBottom,
  inlineSidebarMarginTop,
} from './inline-sidebar-constants';
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
  sub,
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
  currentInputBarHeight: number,
  targetInputBarHeight: number,
  sidebarThreadInfo: ?ThreadInfo,
): {
  +position: number,
  +color: string,
} {
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

  if (!sidebarThreadInfo) {
    return {
      position: 0,
      color: sourceMessage.threadInfo.color,
    };
  }

  const authorNameComponentHeight = sourceMessage.messageInfo.creator.isViewer
    ? 0
    : authorNameHeight;
  const currentDistanceFromBottom =
    messageListVerticalBounds.height +
    messageListVerticalBounds.y -
    initialCoordinates.y +
    timestampHeight +
    authorNameComponentHeight +
    currentInputBarHeight;
  return {
    position:
      targetDistanceFromBottom +
      targetInputBarHeight -
      currentDistanceFromBottom,
    color: sidebarThreadInfo.color,
  };
}

type AnimatedMessageArgs = {
  +sourceMessage: ChatMessageInfoItemWithHeight,
  +initialCoordinates: LayoutCoordinates,
  +messageListVerticalBounds: VerticalBounds,
  +progress: Node,
  +targetInputBarHeight: ?number,
};

function useAnimatedMessageTooltipButton({
  sourceMessage,
  initialCoordinates,
  messageListVerticalBounds,
  progress,
  targetInputBarHeight,
}: AnimatedMessageArgs): {
  +style: AnimatedViewStyle,
  +threadColorOverride: ?Node,
  +isThreadColorDarkOverride: ?boolean,
} {
  const chatContext = React.useContext(ChatContext);
  invariant(chatContext, 'chatContext should be set');
  const {
    currentTransitionSidebarSourceID,
    setCurrentTransitionSidebarSourceID,
    chatInputBarHeights,
    sidebarAnimationType,
    setSidebarAnimationType,
  } = chatContext;

  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const sidebarThreadInfo = React.useMemo(() => {
    return getSidebarThreadInfo(sourceMessage, viewerID);
  }, [sourceMessage, viewerID]);

  const currentInputBarHeight =
    chatInputBarHeights.get(sourceMessage.threadInfo.id) ?? 0;
  const keyboardState = React.useContext(KeyboardContext);
  const viewerIsSidebarMember = viewerIsMember(sidebarThreadInfo);
  React.useEffect(() => {
    const newSidebarAnimationType =
      !currentInputBarHeight ||
      !targetInputBarHeight ||
      keyboardState?.keyboardShowing ||
      !viewerIsSidebarMember
        ? 'fade_source_message'
        : 'move_source_message';
    setSidebarAnimationType(newSidebarAnimationType);
  }, [
    currentInputBarHeight,
    keyboardState?.keyboardShowing,
    setSidebarAnimationType,
    sidebarThreadInfo,
    targetInputBarHeight,
    viewerIsSidebarMember,
  ]);

  const {
    position: targetPosition,
    color: targetColor,
  } = useMessageTargetParameters(
    sourceMessage,
    initialCoordinates,
    messageListVerticalBounds,
    currentInputBarHeight,
    targetInputBarHeight ?? currentInputBarHeight,
    sidebarThreadInfo,
  );

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
      opacity:
        currentTransitionSidebarSourceID &&
        sidebarAnimationType === 'fade_source_message'
          ? 0
          : 1,
    };
  }, [bottom, currentTransitionSidebarSourceID, sidebarAnimationType]);

  return {
    style: messageContainerStyle,
    threadColorOverride,
    isThreadColorDarkOverride,
  };
}

function getMessageTooltipKey(item: ChatMessageInfoItemWithHeight): string {
  return `tooltip|${messageKey(item.messageInfo)}`;
}

function isMessageTooltipKey(key: string): boolean {
  return key.startsWith('tooltip|');
}

function useOverlayPosition(item: ChatMessageInfoItemWithHeight) {
  const overlayContext = React.useContext(OverlayContext);
  invariant(overlayContext, 'should be set');

  for (const overlay of overlayContext.visibleOverlays) {
    if (
      (overlay.routeName === MultimediaMessageTooltipModalRouteName ||
        overlay.routeName === TextMessageTooltipModalRouteName ||
        overlay.routeName === RobotextMessageTooltipModalRouteName) &&
      overlay.routeKey === getMessageTooltipKey(item)
    ) {
      return overlay.position;
    }
  }
  return undefined;
}

function useContentAndHeaderOpacity(
  item: ChatMessageInfoItemWithHeight,
): number | Node {
  const overlayPosition = useOverlayPosition(item);
  const chatContext = React.useContext(ChatContext);
  return React.useMemo(
    () =>
      overlayPosition &&
      chatContext?.sidebarAnimationType === 'move_source_message'
        ? sub(
            1,
            interpolateNode(overlayPosition, {
              inputRange: [0.05, 0.06],
              outputRange: [0, 1],
              extrapolate: Extrapolate.CLAMP,
            }),
          )
        : 1,
    [chatContext?.sidebarAnimationType, overlayPosition],
  );
}

function useDeliveryIconOpacity(
  item: ChatMessageInfoItemWithHeight,
): number | Node {
  const overlayPosition = useOverlayPosition(item);
  const chatContext = React.useContext(ChatContext);
  return React.useMemo(() => {
    if (
      !overlayPosition ||
      !chatContext?.currentTransitionSidebarSourceID ||
      chatContext?.sidebarAnimationType === 'fade_source_message'
    ) {
      return 1;
    }
    return interpolateNode(overlayPosition, {
      inputRange: [0.05, 0.06, 1],
      outputRange: [1, 0, 0],
      extrapolate: Extrapolate.CLAMP,
    });
  }, [
    chatContext?.currentTransitionSidebarSourceID,
    chatContext?.sidebarAnimationType,
    overlayPosition,
  ]);
}

export {
  chatMessageItemHeight,
  useAnimatedMessageTooltipButton,
  messageItemHeight,
  getMessageTooltipKey,
  isMessageTooltipKey,
  useContentAndHeaderOpacity,
  useDeliveryIconOpacity,
};
