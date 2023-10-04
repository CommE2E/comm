// @flow

import Icon from '@expo/vector-icons/Feather.js';
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useDerivedValue,
  withTiming,
  interpolateColor,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { getMessageLabel } from 'lib/shared/edit-messages-utils.js';
import { createMessageReply } from 'lib/shared/message-utils.js';
import { assertComposableMessageType } from 'lib/types/message-types.js';

import {
  clusterEndHeight,
  composedMessageStyle,
  avatarOffset,
} from './chat-constants.js';
import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { FailedSend } from './failed-send.react.js';
import { InlineEngagement } from './inline-engagement.react.js';
import { MessageEditingContext } from './message-editing-context.react.js';
import { MessageHeader } from './message-header.react.js';
import { useNavigateToSidebar } from './sidebar-navigation.js';
import SwipeableMessage from './swipeable-message.react.js';
import { useContentAndHeaderOpacity, useDeliveryIconOpacity } from './utils.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import CommIcon from '../components/comm-icon.react.js';
import { InputStateContext } from '../input/input-state.js';
import { useColors } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { type AnimatedStyleObj, AnimatedView } from '../types/styles.js';

type SwipeOptions = 'reply' | 'sidebar' | 'both' | 'none';
type Props = {
  ...React.ElementConfig<typeof View>,
  +item: ChatMessageInfoItemWithHeight,
  +sendFailed: boolean,
  +focused: boolean,
  +swipeOptions: SwipeOptions,
  +shouldDisplayPinIndicator: boolean,
  +children: React.Node,
};

const ConnectedComposedMessage: React.ComponentType<Props> = React.memo<Props>(
  function ConnectedComposedMessage(props: Props) {
    const composedMessageMaxWidth = useComposedMessageMaxWidth();
    const colors = useColors();
    const inputState = React.useContext(InputStateContext);
    const navigateToSidebar = useNavigateToSidebar(props.item);
    const contentAndHeaderOpacity = useContentAndHeaderOpacity(props.item);
    const deliveryIconOpacity = useDeliveryIconOpacity(props.item);

    const messageEditingContext = React.useContext(MessageEditingContext);
    const progress = useDerivedValue(() => {
      const isThisThread =
        messageEditingContext?.editState.editedMessage?.threadID ===
        props.item.threadInfo.id;
      const isHighlighted =
        messageEditingContext?.editState.editedMessage?.id ===
          props.item.messageInfo.id && isThisThread;
      return withTiming(isHighlighted ? 1 : 0);
    });

    const editedMessageStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', `#${props.item.threadInfo.color}40`],
      );
      return {
        backgroundColor,
      };
    });

    assertComposableMessageType(props.item.messageInfo.type);
    const {
      item,
      sendFailed,
      swipeOptions,
      shouldDisplayPinIndicator,
      children,
      focused,
      ...viewProps
    } = props;

    const { hasBeenEdited, isPinned } = item;
    const { id, creator } = item.messageInfo;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;

    const containerStyle = React.useMemo(() => {
      let containerMarginBottom = 5;
      if (item.endsCluster) {
        containerMarginBottom += clusterEndHeight;
      }
      return { marginBottom: containerMarginBottom };
    }, [item.endsCluster]);

    const messageBoxContainerStyle = React.useMemo(
      () => [
        styles.messageBoxContainer,
        isViewer ? styles.rightChatContainer : styles.leftChatContainer,
      ],
      [isViewer],
    );

    const deliveryIcon = React.useMemo(() => {
      if (!isViewer) {
        return undefined;
      }

      let deliveryIconName;
      let deliveryIconColor = `#${item.threadInfo.color}`;

      if (id !== null && id !== undefined) {
        deliveryIconName = 'check-circle';
      } else if (sendFailed) {
        deliveryIconName = 'x-circle';
        deliveryIconColor = colors.redText;
      } else {
        deliveryIconName = 'circle';
      }

      const animatedStyle: AnimatedStyleObj = { opacity: deliveryIconOpacity };

      return (
        <AnimatedView style={[styles.iconContainer, animatedStyle]}>
          <Icon
            name={deliveryIconName}
            style={[styles.icon, { color: deliveryIconColor }]}
          />
        </AnimatedView>
      );
    }, [
      colors.redText,
      deliveryIconOpacity,
      id,
      isViewer,
      item.threadInfo.color,
      sendFailed,
    ]);

    const editInputMessage = inputState?.editInputMessage;
    const reply = React.useCallback(() => {
      invariant(editInputMessage, 'editInputMessage should be set in reply');
      invariant(item.messageInfo.text, 'text should be set in reply');
      editInputMessage({
        message: createMessageReply(item.messageInfo.text),
        mode: 'prepend',
      });
    }, [editInputMessage, item.messageInfo.text]);

    const triggerReply =
      swipeOptions === 'reply' || swipeOptions === 'both' ? reply : undefined;

    const triggerSidebar =
      swipeOptions === 'sidebar' || swipeOptions === 'both'
        ? navigateToSidebar
        : undefined;

    const avatar = React.useMemo(() => {
      if (!isViewer && item.endsCluster) {
        return (
          <View style={styles.avatarContainer}>
            <UserAvatar size="S" userID={item.messageInfo.creator.id} />
          </View>
        );
      } else if (!isViewer) {
        return <View style={styles.avatarOffset} />;
      } else {
        return undefined;
      }
    }, [isViewer, item.endsCluster, item.messageInfo.creator.id]);

    const pinIconPositioning = isViewer ? 'left' : 'right';
    const pinIconName = pinIconPositioning === 'left' ? 'pin-mirror' : 'pin';
    const messageBoxTopLevelContainerStyle =
      pinIconPositioning === 'left'
        ? styles.rightMessageBoxTopLevelContainerStyle
        : styles.leftMessageBoxTopLevelContainerStyle;

    const pinIcon = React.useMemo(() => {
      if (!isPinned || !shouldDisplayPinIndicator) {
        return undefined;
      }
      return (
        <View style={styles.pinIconContainer}>
          <CommIcon
            name={pinIconName}
            size={12}
            style={{ color: `#${item.threadInfo.color}` }}
          />
        </View>
      );
    }, [
      isPinned,
      item.threadInfo.color,
      pinIconName,
      shouldDisplayPinIndicator,
    ]);

    const messageBoxStyle = React.useMemo(
      () => ({
        opacity: contentAndHeaderOpacity,
        maxWidth: composedMessageMaxWidth,
      }),
      [composedMessageMaxWidth, contentAndHeaderOpacity],
    );

    const messageBox = React.useMemo(
      () => (
        <View style={messageBoxTopLevelContainerStyle}>
          {pinIcon}
          <View style={messageBoxContainerStyle}>
            <SwipeableMessage
              triggerReply={triggerReply}
              triggerSidebar={triggerSidebar}
              isViewer={isViewer}
              contentStyle={styles.swipeableContainer}
              threadColor={item.threadInfo.color}
            >
              {avatar}
              <AnimatedView style={messageBoxStyle}>{children}</AnimatedView>
            </SwipeableMessage>
          </View>
        </View>
      ),
      [
        avatar,
        children,
        isViewer,
        item.threadInfo.color,
        messageBoxContainerStyle,
        messageBoxStyle,
        messageBoxTopLevelContainerStyle,
        pinIcon,
        triggerReply,
        triggerSidebar,
      ],
    );

    const inlineEngagement = React.useMemo(() => {
      const label = getMessageLabel(hasBeenEdited, item.threadInfo.id);
      if (
        !item.threadCreatedFromMessage &&
        Object.keys(item.reactions).length <= 0 &&
        !label
      ) {
        return undefined;
      }
      const positioning = isViewer ? 'right' : 'left';
      return (
        <InlineEngagement
          messageInfo={item.messageInfo}
          threadInfo={item.threadInfo}
          sidebarThreadInfo={item.threadCreatedFromMessage}
          reactions={item.reactions}
          positioning={positioning}
          label={label}
        />
      );
    }, [
      hasBeenEdited,
      isViewer,
      item.messageInfo,
      item.reactions,
      item.threadCreatedFromMessage,
      item.threadInfo,
    ]);

    const viewStyle = React.useMemo(() => {
      const baseStyle = [styles.alignment];
      if (__DEV__) {
        return baseStyle;
      }
      if (item.messageShapeType === 'text') {
        baseStyle.push({ height: item.contentHeight });
      } else if (item.messageShapeType === 'multimedia') {
        const height = item.inlineEngagementHeight
          ? item.contentHeight + item.inlineEngagementHeight
          : item.contentHeight;
        baseStyle.push({ height });
      }
      return baseStyle;
    }, [
      item.contentHeight,
      item.inlineEngagementHeight,
      item.messageShapeType,
    ]);

    const messageHeaderStyle = React.useMemo(
      () => ({
        opacity: contentAndHeaderOpacity,
      }),
      [contentAndHeaderOpacity],
    );

    const animatedContainerStyle = React.useMemo(
      () => [containerStyle, editedMessageStyle],
      [containerStyle, editedMessageStyle],
    );

    const contentStyle = React.useMemo(
      () => [styles.content, alignStyle],
      [alignStyle],
    );

    const failedSend = React.useMemo(
      () => (sendFailed ? <FailedSend item={item} /> : undefined),
      [item, sendFailed],
    );

    const composedMessage = React.useMemo(() => {
      return (
        <View {...viewProps}>
          <AnimatedView style={messageHeaderStyle}>
            <MessageHeader
              item={item}
              focused={focused}
              display="lowContrast"
            />
          </AnimatedView>
          <AnimatedView style={animatedContainerStyle}>
            <View style={viewStyle}>
              <View style={contentStyle}>
                {deliveryIcon}
                {messageBox}
              </View>
              {inlineEngagement}
            </View>
            {failedSend}
          </AnimatedView>
        </View>
      );
    }, [
      animatedContainerStyle,
      contentStyle,
      deliveryIcon,
      failedSend,
      focused,
      inlineEngagement,
      item,
      messageBox,
      messageHeaderStyle,
      viewProps,
      viewStyle,
    ]);

    return composedMessage;
  },
);

const styles = StyleSheet.create({
  alignment: {
    marginLeft: composedMessageStyle.marginLeft,
    marginRight: composedMessageStyle.marginRight,
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarOffset: {
    width: avatarOffset,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
  },
  icon: {
    fontSize: 16,
    textAlign: 'center',
  },
  iconContainer: {
    marginLeft: 2,
    width: 16,
  },
  leftChatBubble: {
    justifyContent: 'flex-end',
  },
  leftChatContainer: {
    alignItems: 'flex-start',
  },
  leftMessageBoxTopLevelContainerStyle: {
    flexDirection: 'row-reverse',
  },
  messageBoxContainer: {
    marginRight: 5,
  },
  pinIconContainer: {
    marginRight: 4,
    marginTop: 4,
  },
  rightChatBubble: {
    justifyContent: 'flex-start',
  },
  rightChatContainer: {
    alignItems: 'flex-end',
  },
  rightMessageBoxTopLevelContainerStyle: {
    flexDirection: 'row',
  },
  swipeableContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
});

export default ConnectedComposedMessage;
