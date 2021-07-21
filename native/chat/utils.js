// @flow

import invariant from 'invariant';
import * as React from 'react';
import Animated from 'react-native-reanimated';

import { useMessageListData } from 'lib/selectors/chat-selectors';

import { useSelector } from '../redux/redux-utils';
import type { LayoutCoordinates, VerticalBounds } from '../types/layout-types';
import type { AnimatedViewStyle } from '../types/styles';
import { ChatContext, useHeightMeasurer } from './chat-context';
import type { ChatMessageItemWithHeight } from './message-list-container.react';
import {
  type ChatMessageInfoItemWithHeight,
  messageItemHeight,
} from './message.react';
import { getSidebarThreadInfo } from './sidebar-navigation';
import { timestampHeight } from './timestamp.react';

/* eslint-disable import/no-named-as-default-member */
const { Node, Extrapolate, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

function chatMessageItemHeight(item: ChatMessageItemWithHeight): number {
  if (item.itemType === 'loader') {
    return 56;
  }
  return messageItemHeight(item);
}

function useMessageTargetPosition(
  sourceMessage: ChatMessageInfoItemWithHeight,
  initialCoordinates: LayoutCoordinates,
  messageListVerticalBounds: VerticalBounds,
): number {
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

  const currentDistanceFromBottom =
    messageListVerticalBounds.height +
    messageListVerticalBounds.y -
    initialCoordinates.y +
    timestampHeight;
  return targetDistanceFromBottom - currentDistanceFromBottom;
}

function useAnimatedMessageTooltipButton(
  sourceMessage: ChatMessageInfoItemWithHeight,
  initialCoordinates: LayoutCoordinates,
  messageListVerticalBounds: VerticalBounds,
  progress: Node,
): { +style: AnimatedViewStyle } {
  const targetPosition = useMessageTargetPosition(
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

  const messageContainerStyle = React.useMemo(() => {
    return {
      bottom: currentTransitionSidebarSourceID ? bottom : 0,
    };
  }, [bottom, currentTransitionSidebarSourceID]);

  return {
    style: messageContainerStyle,
  };
}

export {
  getSidebarThreadInfo,
  chatMessageItemHeight,
  useAnimatedMessageTooltipButton,
};
