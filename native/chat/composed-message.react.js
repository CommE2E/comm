// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { assertComposableMessageType } from 'lib/types/message-types';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { stringForUser } from 'lib/shared/user-utils';

import FailedSend from './failed-send.react';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  sendFailed: bool,
  children: React.Node,
  borderRadius: number,
|};
class ComposedMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
    borderRadius: PropTypes.number.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { item, borderRadius } = this.props;
    const { id, creator } = item.messageInfo;
    const threadColor = item.threadInfo.color;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;
    const containerStyle = [
      styles.alignment,
      { marginBottom: item.endsCluster ? 12 : 5 },
    ];
    const messageStyle = {
      borderTopRightRadius:
        isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomRightRadius:
        isViewer && !item.endsCluster ? 0 : borderRadius,
      borderTopLeftRadius:
        !isViewer && !item.startsCluster ? 0 : borderRadius,
      borderBottomLeftRadius:
        !isViewer && !item.endsCluster ? 0 : borderRadius,
    };

    let authorName = null;
    if (!isViewer && item.startsCluster) {
      authorName = (
        <Text style={styles.authorName}>
          {stringForUser(creator)}
        </Text>
      );
    }

    let deliveryIcon = null;
    let failedSendInfo = null;
    if (isViewer) {
      let deliveryIconName;
      let deliveryIconColor = threadColor;
      if (id !== null && id !== undefined) {
        deliveryIconName = "check-circle";
      } else if (this.props.sendFailed) {
        deliveryIconName = "x-circle";
        deliveryIconColor = "FF0000";
        failedSendInfo = <FailedSend item={item} />;
      } else {
        deliveryIconName = "circle";
      }
      deliveryIcon = (
        <View style={styles.iconContainer}>
          <Icon
            name={deliveryIconName}
            style={[styles.icon, { color: `#${deliveryIconColor}` }]}
          />
        </View>
      );
    }

    return (
      <View style={containerStyle}>
        {authorName}
        <View style={styles.content}>
          <View style={[styles.messageBox, alignStyle]}>
            <View style={[styles.message, messageStyle]}>
              {this.props.children}
            </View>
          </View>
          {deliveryIcon}
        </View>
        {failedSendInfo}
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
  message: {
    overflow: 'hidden',
  },
  authorName: {
    color: '#777777',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 25,
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

export default ComposedMessage;
