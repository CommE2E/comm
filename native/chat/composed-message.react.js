// @flow

import Icon from '@expo/vector-icons/Feather.js';
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
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
import { type InputState, InputStateContext } from '../input/input-state.js';
import { type Colors, useColors } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { type AnimatedStyleObj, AnimatedView } from '../types/styles.js';

/* eslint-disable import/no-named-as-default-member */
const { Node } = Animated;
/* eslint-enable import/no-named-as-default-member */

type SwipeOptions = 'reply' | 'sidebar' | 'both' | 'none';
type BaseProps = {
  ...React.ElementConfig<typeof View>,
  +item: ChatMessageInfoItemWithHeight,
  +sendFailed: boolean,
  +focused: boolean,
  +swipeOptions: SwipeOptions,
  +shouldDisplayPinIndicator: boolean,
  +children: React.Node,
};
type Props = {
  ...BaseProps,
  // Redux state
  +composedMessageMaxWidth: number,
  +colors: Colors,
  +contentAndHeaderOpacity: number | Node,
  +deliveryIconOpacity: number | Node,
  // withInputState
  +inputState: ?InputState,
  +navigateToSidebar: () => mixed,
  +editedMessageStyle: AnimatedStyleObj,
};
class ComposedMessage extends React.PureComponent<Props> {
  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const {
      item,
      sendFailed,
      focused,
      swipeOptions,
      shouldDisplayPinIndicator,
      children,
      composedMessageMaxWidth,
      colors,
      inputState,
      navigateToSidebar,
      contentAndHeaderOpacity,
      deliveryIconOpacity,
      editedMessageStyle,
      ...viewProps
    } = this.props;
    const { id, creator } = item.messageInfo;
    const { hasBeenEdited, isPinned } = item;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;

    let containerMarginBottom = 5;
    if (item.endsCluster) {
      containerMarginBottom += clusterEndHeight;
    }
    const containerStyle = { marginBottom: containerMarginBottom };

    const messageBoxContainerStyle = [styles.messageBoxContainer];
    const positioningStyle = isViewer
      ? styles.rightChatContainer
      : styles.leftChatContainer;
    messageBoxContainerStyle.push(positioningStyle);

    let deliveryIcon = null;
    let failedSendInfo = null;
    if (isViewer) {
      let deliveryIconName;
      let deliveryIconColor = `#${item.threadInfo.color}`;
      if (id !== null && id !== undefined) {
        deliveryIconName = 'check-circle';
      } else if (sendFailed) {
        deliveryIconName = 'x-circle';
        deliveryIconColor = colors.redText;
        failedSendInfo = <FailedSend item={item} />;
      } else {
        deliveryIconName = 'circle';
      }

      const animatedStyle: AnimatedStyleObj = { opacity: deliveryIconOpacity };
      deliveryIcon = (
        <AnimatedView style={[styles.iconContainer, animatedStyle]}>
          <Icon
            name={deliveryIconName}
            style={[styles.icon, { color: deliveryIconColor }]}
          />
        </AnimatedView>
      );
    }

    const triggerReply =
      swipeOptions === 'reply' || swipeOptions === 'both'
        ? this.reply
        : undefined;
    const triggerSidebar =
      swipeOptions === 'sidebar' || swipeOptions === 'both'
        ? navigateToSidebar
        : undefined;

    let avatar;
    if (!isViewer && item.endsCluster) {
      avatar = (
        <View style={styles.avatarContainer}>
          <UserAvatar size="small" userID={item.messageInfo.creator.id} />
        </View>
      );
    } else if (!isViewer) {
      avatar = <View style={styles.avatarOffset} />;
    }

    const pinIconPositioning = isViewer ? 'left' : 'right';
    const pinIconName = pinIconPositioning === 'left' ? 'pin-mirror' : 'pin';
    const messageBoxTopLevelContainerStyle =
      pinIconPositioning === 'left'
        ? styles.rightMessageBoxTopLevelContainerStyle
        : styles.leftMessageBoxTopLevelContainerStyle;

    let pinIcon;
    if (isPinned && shouldDisplayPinIndicator) {
      pinIcon = (
        <View style={styles.pinIconContainer}>
          <CommIcon
            name={pinIconName}
            size={12}
            style={{ color: `#${item.threadInfo.color}` }}
          />
        </View>
      );
    }

    const messageBoxStyle = {
      opacity: contentAndHeaderOpacity,
      maxWidth: composedMessageMaxWidth,
    };

    const messageBox = (
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
    );

    let inlineEngagement = null;
    const label = getMessageLabel(hasBeenEdited, item.threadInfo.id);
    if (
      item.threadCreatedFromMessage ||
      Object.keys(item.reactions).length > 0 ||
      label
    ) {
      const positioning = isViewer ? 'right' : 'left';
      inlineEngagement = (
        <InlineEngagement
          messageInfo={item.messageInfo}
          threadInfo={item.threadInfo}
          sidebarThreadInfo={item.threadCreatedFromMessage}
          reactions={item.reactions}
          positioning={positioning}
          label={label}
        />
      );
    }

    const viewStyle = [styles.alignment];
    if (!__DEV__) {
      // We don't force view height in dev mode because we
      // want to measure it in Message to see if it's correct
      if (item.messageShapeType === 'text') {
        viewStyle.push({ height: item.contentHeight });
      } else if (item.messageShapeType === 'multimedia') {
        const height = item.inlineEngagementHeight
          ? item.contentHeight + item.inlineEngagementHeight
          : item.contentHeight;
        viewStyle.push({ height });
      }
    }

    return (
      <View {...viewProps}>
        <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
          <MessageHeader item={item} focused={focused} display="lowContrast" />
        </AnimatedView>
        <AnimatedView style={[containerStyle, editedMessageStyle]}>
          <View style={viewStyle}>
            <View style={[styles.content, alignStyle]}>
              {deliveryIcon}
              {messageBox}
            </View>
            {failedSendInfo}
            {inlineEngagement}
          </View>
        </AnimatedView>
      </View>
    );
  }

  reply = () => {
    const { inputState, item } = this.props;
    invariant(inputState, 'inputState should be set in reply');
    invariant(item.messageInfo.text, 'text should be set in reply');
    inputState.editInputMessage({
      message: createMessageReply(item.messageInfo.text),
      mode: 'prepend',
    });
  };
}

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

const ConnectedComposedMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedComposedMessage(props: BaseProps) {
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

    return (
      <ComposedMessage
        {...props}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        inputState={inputState}
        navigateToSidebar={navigateToSidebar}
        contentAndHeaderOpacity={contentAndHeaderOpacity}
        deliveryIconOpacity={deliveryIconOpacity}
        editedMessageStyle={editedMessageStyle}
      />
    );
  });

export default ConnectedComposedMessage;
