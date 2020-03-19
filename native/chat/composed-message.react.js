// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { assertComposableMessageType } from 'lib/types/message-types';
import type { AppState } from '../redux/redux-setup';
import { type Colors, colorsPropType } from '../themes/colors';

import * as React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { connect } from 'lib/utils/redux-utils';

import { FailedSend } from './failed-send.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';
import { MessageHeader } from './message-header.react';
import { colorsSelector } from '../themes/colors';

const clusterEndHeight = 7;

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  sendFailed: boolean,
  focused: boolean,
  children: React.Node,
  // Redux state
  composedMessageMaxWidth: number,
  colors: Colors,
  ...React.ElementProps<typeof View>,
|};
class ComposedMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    focused: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
    colors: colorsPropType.isRequired,
  };

  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { item, focused, sendFailed, children, ...viewProps } = this.props;
    const { id, creator } = item.messageInfo;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;
    const containerStyle = [
      styles.alignment,
      { marginBottom: 5 + (item.endsCluster ? clusterEndHeight : 0) },
    ];
    const messageBoxStyle = {
      maxWidth: this.props.composedMessageMaxWidth,
    };

    let deliveryIcon = null;
    let failedSendInfo = null;
    if (isViewer) {
      let deliveryIconName;
      let deliveryIconColor = `#${item.threadInfo.color}`;
      if (id !== null && id !== undefined) {
        deliveryIconName = 'check-circle';
      } else if (sendFailed) {
        deliveryIconName = 'x-circle';
        deliveryIconColor = this.props.colors.redText;
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

    return (
      <View {...viewProps}>
        <MessageHeader item={item} focused={focused} display="lowContrast" />
        <View style={containerStyle}>
          <View style={[styles.content, alignStyle]}>
            <View style={[styles.messageBox, messageBoxStyle, alignStyle]}>
              {children}
            </View>
            {deliveryIcon}
          </View>
          {failedSendInfo}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  alignment: {
    marginLeft: 12,
    marginRight: 7,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageBox: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 5,
  },
  leftChatBubble: {
    justifyContent: 'flex-start',
  },
  rightChatBubble: {
    justifyContent: 'flex-end',
  },
  iconContainer: {
    marginLeft: 2,
    width: 16,
  },
  icon: {
    fontSize: 16,
    textAlign: 'center',
  },
});

const ConnectedComposedMessage = connect((state: AppState) => ({
  composedMessageMaxWidth: composedMessageMaxWidthSelector(state),
  colors: colorsSelector(state),
}))(ComposedMessage);

export { ConnectedComposedMessage as ComposedMessage, clusterEndHeight };
