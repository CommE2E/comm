// @flow

import Icon from '@expo/vector-icons/Feather.js';
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

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
import { MessageHeader } from './message-header.react.js';
import { useNavigateToSidebar } from './sidebar-navigation.js';
import SwipeableMessage from './swipeable-message.react.js';
import { useContentAndHeaderOpacity, useDeliveryIconOpacity } from './utils.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { type Colors, useColors } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { type AnimatedStyleObj, AnimatedView } from '../types/styles.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

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
  +shouldRenderAvatars: boolean,
};
class ComposedMessage extends React.PureComponent<Props> {
  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const {
      item,
      sendFailed,
      focused,
      swipeOptions,
      children,
      composedMessageMaxWidth,
      colors,
      inputState,
      navigateToSidebar,
      contentAndHeaderOpacity,
      deliveryIconOpacity,
      shouldRenderAvatars,
      ...viewProps
    } = this.props;
    const { id, creator } = item.messageInfo;
    const { hasBeenEdited } = item;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;

    let containerMarginBottom = 5;
    if (item.endsCluster) {
      containerMarginBottom += clusterEndHeight;
    }

    const containerStyle = [
      styles.alignment,
      { marginBottom: containerMarginBottom },
    ];
    const swipeableMessageBoxStyle = [
      styles.swipeableContainer,
      { maxWidth: composedMessageMaxWidth },
    ];

    const messageBoxStyleContainerStyle = [styles.messageBoxContainer];
    const positioningStyle = isViewer
      ? { alignItems: 'flex-end' }
      : { alignItems: 'flex-start' };
    messageBoxStyleContainerStyle.push(positioningStyle);

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
    if (!isViewer && item.endsCluster && shouldRenderAvatars) {
      avatar = (
        <View style={styles.avatarContainer}>
          <UserAvatar size="small" userID={item.messageInfo.creator.id} />
        </View>
      );
    } else if (!isViewer && shouldRenderAvatars) {
      avatar = <View style={styles.avatarOffset} />;
    }

    const messageBox = (
      <View style={messageBoxStyleContainerStyle}>
        <SwipeableMessage
          triggerReply={triggerReply}
          triggerSidebar={triggerSidebar}
          isViewer={isViewer}
          messageBoxStyle={swipeableMessageBoxStyle}
          threadColor={item.threadInfo.color}
        >
          {avatar}
          <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
            {children}
          </AnimatedView>
        </SwipeableMessage>
      </View>
    );

    let inlineEngagement = null;
    const label = getMessageLabel(hasBeenEdited, item.threadInfo);
    if (
      item.threadCreatedFromMessage ||
      Object.keys(item.reactions).length > 0 ||
      label
    ) {
      const positioning = isViewer ? 'right' : 'left';
      inlineEngagement = (
        <InlineEngagement
          threadInfo={item.threadCreatedFromMessage}
          reactions={item.reactions}
          positioning={positioning}
          shouldRenderAvatars={shouldRenderAvatars}
          label={label}
        />
      );
    }

    return (
      <View {...viewProps}>
        <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
          <MessageHeader item={item} focused={focused} display="lowContrast" />
        </AnimatedView>
        <View style={containerStyle}>
          <View style={[styles.content, alignStyle]}>
            {deliveryIcon}
            {messageBox}
          </View>
          {failedSendInfo}
          {inlineEngagement}
        </View>
      </View>
    );
  }

  reply = () => {
    const { inputState, item } = this.props;
    invariant(inputState, 'inputState should be set in reply');
    invariant(item.messageInfo.text, 'text should be set in reply');
    inputState.addReply(createMessageReply(item.messageInfo.text));
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
  messageBoxContainer: {
    flex: 1,
    marginRight: 5,
  },
  rightChatBubble: {
    justifyContent: 'flex-start',
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
    const shouldRenderAvatars = useShouldRenderAvatars();

    return (
      <ComposedMessage
        {...props}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        inputState={inputState}
        navigateToSidebar={navigateToSidebar}
        contentAndHeaderOpacity={contentAndHeaderOpacity}
        deliveryIconOpacity={deliveryIconOpacity}
        shouldRenderAvatars={shouldRenderAvatars}
      />
    );
  });

export default ConnectedComposedMessage;
