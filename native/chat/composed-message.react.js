// @flow

import invariant from 'invariant';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { createMessageReply } from 'lib/shared/message-utils';
import { assertComposableMessageType } from 'lib/types/message-types';
import PropTypes from 'prop-types';
import * as React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import {
  inputStatePropType,
  type InputState,
  InputStateContext,
} from '../input/input-state';
import { useSelector } from '../redux/redux-utils';
import { type Colors, colorsPropType, useColors } from '../themes/colors';

import { composedMessageMaxWidthSelector } from './composed-message-width';
import { FailedSend } from './failed-send.react';
import { MessageHeader } from './message-header.react';
import type { ChatMessageInfoItemWithHeight } from './message.react';
import SwipeableMessage from './swipeable-message.react';

const clusterEndHeight = 7;

type BaseProps = {|
  ...React.ElementConfig<typeof View>,
  +item: ChatMessageInfoItemWithHeight,
  +sendFailed: boolean,
  +focused: boolean,
  +canSwipe?: boolean,
  +children: React.Node,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +composedMessageMaxWidth: number,
  +colors: Colors,
  // withInputState
  +inputState: ?InputState,
|};
class ComposedMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    focused: PropTypes.bool.isRequired,
    canSwipe: PropTypes.bool,
    children: PropTypes.node.isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
    inputState: inputStatePropType,
  };

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

    const fullMessageBoxStyle = [styles.messageBox, messageBoxStyle];
    let messageBox;
    if (canSwipe && (Platform.OS !== 'android' || Platform.Version >= 21)) {
      messageBox = (
        <SwipeableMessage
          onSwipeableWillOpen={this.reply}
          isViewer={isViewer}
          messageBoxStyle={fullMessageBoxStyle}
        >
          {children}
        </SwipeableMessage>
      );
    } else {
      messageBox = <View style={fullMessageBoxStyle}>{children}</View>;
    }

    return (
      <View {...viewProps}>
        <MessageHeader item={item} focused={focused} display="lowContrast" />
        <View style={containerStyle}>
          <View style={[styles.content, alignStyle]}>
            {messageBox}
            {deliveryIcon}
          </View>
          {failedSendInfo}
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
    flexDirection: 'row',
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
    justifyContent: 'flex-start',
  },
  messageBox: {
    marginRight: 5,
  },
  rightChatBubble: {
    justifyContent: 'flex-end',
  },
});

const ConnectedComposedMessage = React.memo<BaseProps>(
  function ConnectedComposedMessage(props: BaseProps) {
    const composedMessageMaxWidth = useSelector(
      composedMessageMaxWidthSelector,
    );
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
