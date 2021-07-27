// @flow

import invariant from 'invariant';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { createMessageReply } from 'lib/shared/message-utils';
import { assertComposableMessageType } from 'lib/types/message-types';

import { type InputState, InputStateContext } from '../input/input-state';
import { type Colors, useColors } from '../themes/colors';
import { useComposedMessageMaxWidth } from './composed-message-width';
import { FailedSend } from './failed-send.react';
import {
  InlineSidebar,
  inlineSidebarMarginBottom,
  inlineSidebarMarginTop,
} from './inline-sidebar.react';
import { MessageHeader } from './message-header.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import SwipeableMessage from './swipeable-message.react';

const clusterEndHeight = 7;

type BaseProps = {
  ...React.ElementConfig<typeof View>,
  +item: ChatMessageInfoItemWithHeight,
  +sendFailed: boolean,
  +focused: boolean,
  +canSwipe?: boolean,
  +children: React.Node,
};
type Props = {
  ...BaseProps,
  // Redux state
  +composedMessageMaxWidth: number,
  +colors: Colors,
  // withInputState
  +inputState: ?InputState,
};
class ComposedMessage extends React.PureComponent<Props> {
  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const {
      item,
      sendFailed,
      focused,
      canSwipe,
      children,
      composedMessageMaxWidth,
      colors,
      inputState,
      ...viewProps
    } = this.props;
    const { id, creator } = item.messageInfo;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;
    const containerStyle = [
      styles.alignment,
      { marginBottom: 5 + (item.endsCluster ? clusterEndHeight : 0) },
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
      deliveryIcon = (
        <View style={styles.iconContainer}>
          <Icon
            name={deliveryIconName}
            style={[styles.icon, { color: deliveryIconColor }]}
          />
        </View>
      );
    }

    let messageBox;
    if (canSwipe) {
      messageBox = (
        <View style={styles.messageBox}>
          <SwipeableMessage
            onSwipeableWillOpen={this.reply}
            isViewer={isViewer}
            messageBoxStyle={messageBoxStyle}
          >
            {children}
          </SwipeableMessage>
        </View>
      );
    } else {
      messageBox = (
        <View style={[styles.messageBox, messageBoxStyle]}>{children}</View>
      );
    }
    let inlineSidebar = null;
    if (item.threadCreatedFromMessage) {
      const positioning = isViewer ? 'right' : 'left';
      inlineSidebar = (
        <View style={styles.inlineSidebar}>
          <InlineSidebar
            threadInfo={item.threadCreatedFromMessage}
            positioning={positioning}
          />
        </View>
      );
    }

    return (
      <View {...viewProps}>
        <MessageHeader item={item} focused={focused} display="lowContrast" />
        <View style={containerStyle}>
          <View style={[styles.content, alignStyle]}>
            {deliveryIcon}
            {messageBox}
          </View>
          {failedSendInfo}
          {inlineSidebar}
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
    marginLeft: 12,
    marginRight: 7,
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
  inlineSidebar: {
    marginBottom: inlineSidebarMarginBottom,
    marginTop: inlineSidebarMarginTop,
  },
  leftChatBubble: {
    justifyContent: 'flex-end',
  },
  messageBox: {
    marginRight: 5,
  },
  rightChatBubble: {
    justifyContent: 'flex-start',
  },
});

const ConnectedComposedMessage: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedComposedMessage(props: BaseProps) {
    const composedMessageMaxWidth = useComposedMessageMaxWidth();
    const colors = useColors();
    const inputState = React.useContext(InputStateContext);
    return (
      <ComposedMessage
        {...props}
        composedMessageMaxWidth={composedMessageMaxWidth}
        colors={colors}
        inputState={inputState}
      />
    );
  },
);
export { ConnectedComposedMessage as ComposedMessage, clusterEndHeight };
