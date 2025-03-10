// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  type SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  interpolateColor,
  Extrapolate,
} from 'react-native-reanimated';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { useThreadChatMentionCandidates } from 'lib/hooks/chat-mention-hooks.js';
import { chatMessageItemKey } from 'lib/shared/chat-message-item-utils.js';
import { colorIsDark } from 'lib/shared/color-utils.js';
import { viewerIsMember } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import { clusterEndHeight } from './chat-constants.js';
import { ChatContext, useHeightMeasurer } from './chat-context.js';
import { failedSendHeight } from './failed-send.react.js';
import { useNativeMessageListData } from './message-data.react.js';
import { authorNameHeight } from './message-header.react.js';
import { multimediaMessageItemHeight } from './multimedia-message-utils.js';
import { getUnresolvedSidebarThreadInfo } from './sidebar-navigation.js';
import textMessageSendFailed from './text-message-send-failed.js';
import { timestampHeight } from './timestamp.react.js';
import { listLoadingIndicatorHeight } from '../components/list-loading-indicator-utils.js';
import { KeyboardContext } from '../keyboard/keyboard-state.js';
import { OverlayContext } from '../navigation/overlay-context.js';
import {
  MultimediaMessageTooltipModalRouteName,
  RobotextMessageTooltipModalRouteName,
  TextMessageTooltipModalRouteName,
} from '../navigation/route-names.js';
import type {
  ChatMessageInfoItemWithHeight,
  ChatMessageItemWithHeight,
  ChatTextMessageInfoItemWithHeight,
} from '../types/chat-types.js';
import type {
  LayoutCoordinates,
  VerticalBounds,
} from '../types/layout-types.js';
import type { AnimatedViewStyle } from '../types/styles.js';

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

  return height;
}

function messageItemHeight(item: ChatMessageInfoItemWithHeight): number {
  let height = 0;
  if (item.messageShapeType === 'text') {
    height += textMessageItemHeight(item);
  } else if (item.messageShapeType === 'multimedia') {
    height += multimediaMessageItemHeight(item);
  } else {
    height += item.contentHeight;
  }
  if (item.startsConversation) {
    height += timestampHeight;
  }
  return height;
}

function chatMessageItemHeight(item: ChatMessageItemWithHeight): number {
  if (item.itemType === 'loader') {
    return listLoadingIndicatorHeight;
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
  const messageListData = useNativeMessageListData({
    searching: false,
    userInfoInputArray: [],
    threadInfo: sidebarThreadInfo,
  });

  const [messagesWithHeight, setMessagesWithHeight] =
    React.useState<?$ReadOnlyArray<ChatMessageItemWithHeight>>(null);
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

  const authorNameComponentHeight =
    !sourceMessage.messageInfo || sourceMessage.messageInfo.creator.isViewer
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
  +progress: SharedValue<number>,
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
  +threadColorOverride: SharedValue<string | null>,
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

  const loggedInUserInfo = useLoggedInUserInfo();
  const chatMentionCandidates = useThreadChatMentionCandidates(
    sourceMessage.threadInfo,
  );
  const sidebarThreadInfo = React.useMemo(
    () =>
      getUnresolvedSidebarThreadInfo({
        sourceMessage,
        loggedInUserInfo,
        chatMentionCandidates,
      }),
    [sourceMessage, loggedInUserInfo, chatMentionCandidates],
  );

  const currentInputBarHeight =
    chatInputBarHeights.get(sourceMessage.threadInfo.id) ?? 0;
  const keyboardState = React.useContext(KeyboardContext);

  const newSidebarAnimationType =
    !currentInputBarHeight ||
    !targetInputBarHeight ||
    keyboardState?.keyboardShowing ||
    !viewerIsMember(sidebarThreadInfo)
      ? 'fade_source_message'
      : 'move_source_message';
  React.useEffect(() => {
    setSidebarAnimationType(newSidebarAnimationType);
  }, [setSidebarAnimationType, newSidebarAnimationType]);

  const { position: targetPosition, color: targetColor } =
    useMessageTargetParameters(
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

  const [isThreadColorDarkOverride, setThreadColorDarkOverride] =
    React.useState<?boolean>(null);
  const setThreadColorBrightness = React.useCallback(() => {
    const isSourceThreadDark = colorIsDark(sourceMessage.threadInfo.color);
    const isTargetThreadDark = colorIsDark(targetColor);
    if (isSourceThreadDark !== isTargetThreadDark) {
      setThreadColorDarkOverride(isTargetThreadDark);
    }
  }, [sourceMessage.threadInfo.color, targetColor]);

  const threadColorOverride = useDerivedValue(() => {
    if (
      sourceMessage.messageShapeType !== 'text' ||
      !currentTransitionSidebarSourceID
    ) {
      return null;
    }
    if (progress.value === 1) {
      runOnJS(setThreadColorBrightness)();
    }
    return interpolateColor(
      progress.value,
      [0, 1],
      [`#${targetColor}`, `#${sourceMessage.threadInfo.color}`],
    );
  }, [
    currentTransitionSidebarSourceID,
    setThreadColorBrightness,
    sourceMessage.messageShapeType,
    sourceMessage.threadInfo.color,
    targetColor,
  ]);

  const messageContainerStyle = useAnimatedStyle(() => {
    const bottom = interpolate(
      progress.value,
      [0.3, 1],
      [targetPosition, 0],
      Extrapolate.CLAMP,
    );
    return {
      bottom: currentTransitionSidebarSourceID ? bottom : 0,
      opacity:
        currentTransitionSidebarSourceID &&
        sidebarAnimationType === 'fade_source_message'
          ? 0
          : 1,
    };
  }, [currentTransitionSidebarSourceID, sidebarAnimationType, targetPosition]);

  return {
    style: messageContainerStyle,
    threadColorOverride,
    isThreadColorDarkOverride,
  };
}

function getMessageTooltipKey(item: ChatMessageInfoItemWithHeight): string {
  return `tooltip|${chatMessageItemKey(item)}`;
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
): SharedValue<number> {
  const overlayPosition = useOverlayPosition(item);
  const chatContext = React.useContext(ChatContext);
  return useDerivedValue(() => {
    return overlayPosition &&
      chatContext?.sidebarAnimationType === 'move_source_message'
      ? 1 -
          interpolate(
            overlayPosition.value,
            [0.05, 0.06],
            [0, 1],
            Extrapolate.CLAMP,
          )
      : 1;
  }, [chatContext?.sidebarAnimationType, overlayPosition]);
}

function useDeliveryIconOpacity(
  item: ChatMessageInfoItemWithHeight,
): SharedValue<number> {
  const overlayPosition = useOverlayPosition(item);
  const chatContext = React.useContext(ChatContext);
  return useDerivedValue(() => {
    if (
      !overlayPosition ||
      !chatContext?.currentTransitionSidebarSourceID ||
      chatContext?.sidebarAnimationType === 'fade_source_message'
    ) {
      return 1;
    }
    return interpolate(
      overlayPosition.value,
      [0.05, 0.06, 1],
      [1, 0, 0],
      Extrapolate.CLAMP,
    );
  }, [
    chatContext?.currentTransitionSidebarSourceID,
    chatContext?.sidebarAnimationType,
    overlayPosition,
  ]);
}

function modifyItemForResultScreen(
  item: ChatMessageInfoItemWithHeight,
): ChatMessageInfoItemWithHeight {
  if (item.messageShapeType === 'robotext') {
    return item;
  }

  if (item.messageShapeType === 'multimedia') {
    return {
      ...item,
      startsConversation: false,
      startsCluster: true,
      endsCluster: true,
      messageInfo: {
        ...item.messageInfo,
        creator: {
          ...item.messageInfo.creator,
          isViewer: false,
        },
      },
    };
  }

  return {
    ...item,
    startsConversation: false,
    startsCluster: true,
    endsCluster: true,
    messageInfo: {
      ...item.messageInfo,
      creator: {
        ...item.messageInfo.creator,
        isViewer: false,
      },
    },
  };
}

export {
  chatMessageItemHeight,
  useAnimatedMessageTooltipButton,
  messageItemHeight,
  getMessageTooltipKey,
  isMessageTooltipKey,
  useContentAndHeaderOpacity,
  useDeliveryIconOpacity,
  modifyItemForResultScreen,
};
