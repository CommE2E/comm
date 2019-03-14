// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { assertComposableMessageType } from 'lib/types/message-types';
import type { ViewStyle } from '../types/styles';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View, ViewPropTypes } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { stringForUser } from 'lib/shared/user-utils';

import FailedSend from './failed-send.react';
import RoundedMessageContainer from './rounded-message-container.react';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  sendFailed: bool,
  style?: ViewStyle,
  borderRadius: number,
  children: React.Node,
|};
class ComposedMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    style: ViewPropTypes.style,
    borderRadius: PropTypes.number.isRequired,
    children: PropTypes.node.isRequired,
  };
  static defaultProps = {
    borderRadius: 8,
  };

  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { item, borderRadius, style } = this.props;
    const { id, creator } = item.messageInfo;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;
    const containerStyle = [
      styles.alignment,
      { marginBottom: item.endsCluster ? 12 : 5 },
    ];

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
      let deliveryIconColor = item.threadInfo.color;
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
            <RoundedMessageContainer
              item={item}
              borderRadius={borderRadius}
              style={style}
            >
              {this.props.children}
            </RoundedMessageContainer>
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
