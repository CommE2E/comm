// @flow

import Icon from '@expo/vector-icons/Feather.js';
import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { createMessageReply } from 'lib/shared/message-utils.js';
import { assertComposableMessageType } from 'lib/types/message-types.js';

import {
  clusterEndHeight,
  inlineEngagementStyle,
  inlineEngagementLeftStyle,
  inlineEngagementRightStyle,
  composedMessageStyle,
} from './chat-constants.js';
import { useComposedMessageMaxWidth } from './composed-message-width.js';
import { FailedSend } from './failed-send.react.js';
import { InlineEngagement } from './inline-engagement.react.js';
import { MessageHeader } from './message-header.react.js';
import { useNavigateToSidebar } from './sidebar-navigation.js';
import SwipeableMessage from './swipeable-message.react.js';
import { useContentAndHeaderOpacity, useDeliveryIconOpacity } from './utils.js';
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
      ...viewProps
    } = this.props;
    const { id, creator } = item.messageInfo;

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
    const messageBoxStyle = { maxWidth: composedMessageMaxWidth };

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
    const messageBox = (
      <View style={styles.messageBox}>
        <SwipeableMessage
          triggerReply={triggerReply}
          triggerSidebar={triggerSidebar}
          isViewer={isViewer}
          messageBoxStyle={messageBoxStyle}
          threadColor={item.threadInfo.color}
        >
          <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
            {children}
          </AnimatedView>
        </SwipeableMessage>
      </View>
    );

    let inlineEngagement = null;
    if (item.threadCreatedFromMessage || item.reactions.size > 0) {
      const positioning = isViewer ? 'right' : 'left';
      const inlineEngagementPositionStyle =
        positioning === 'left'
          ? styles.leftInlineEngagement
          : styles.rightInlineEngagement;
      inlineEngagement = (
        <View style={[styles.inlineEngagement, inlineEngagementPositionStyle]}>
          <InlineEngagement
            threadInfo={item.threadCreatedFromMessage}
            reactions={item.reactions}
          />
        </View>
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
  inlineEngagement: {
    marginBottom: inlineEngagementStyle.marginBottom,
    marginTop: inlineEngagementStyle.marginTop,
  },
  leftChatBubble: {
    justifyContent: 'flex-end',
  },
  leftInlineEngagement: {
    justifyContent: 'flex-start',
    position: 'relative',
    top: inlineEngagementLeftStyle.topOffset,
  },
  messageBox: {
    marginRight: 5,
  },
  rightChatBubble: {
    justifyContent: 'flex-start',
  },
  rightInlineEngagement: {
    alignSelf: 'flex-end',
    position: 'relative',
    right: inlineEngagementRightStyle.marginRight,
    top: inlineEngagementRightStyle.topOffset,
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
    return (
      <ComposedMessage
        {...props}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        inputState={inputState}
        navigateToSidebar={navigateToSidebar}
        contentAndHeaderOpacity={contentAndHeaderOpacity}
        deliveryIconOpacity={deliveryIconOpacity}
      />
    );
  });

export default ConnectedComposedMessage;
