// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import { assertComposableMessageType } from 'lib/types/message-types';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import PropTypes from 'prop-types';
import { Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { stringForUser } from 'lib/shared/user-utils';
import { connect } from 'lib/utils/redux-utils';

import FailedSend from './failed-send.react';
import { composedMessageMaxWidthSelector } from './composed-message-width';

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  sendFailed: bool,
  focused: bool,
  children: React.Node,
  // Redux state
  composedMessageMaxWidth: number,
|};
class ComposedMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    sendFailed: PropTypes.bool.isRequired,
    focused: PropTypes.bool.isRequired,
    children: PropTypes.node.isRequired,
    composedMessageMaxWidth: PropTypes.number.isRequired,
  };

  render() {
    assertComposableMessageType(this.props.item.messageInfo.type);
    const { item, focused } = this.props;
    const { id, creator } = item.messageInfo;

    const { isViewer } = creator;
    const alignStyle = isViewer
      ? styles.rightChatBubble
      : styles.leftChatBubble;
    const containerStyle = [
      styles.alignment,
      { marginBottom: item.endsCluster ? 12 : 5 },
    ];
    const messageBoxStyle = {
      maxWidth: this.props.composedMessageMaxWidth,
    };

    let authorName = null;
    if (!isViewer && (item.startsCluster || focused)) {
      authorName = (
        <Text style={styles.authorName} numberOfLines={1}>
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
        <View style={[ styles.content, alignStyle ]}>
          <View style={[ styles.messageBox, messageBoxStyle, alignStyle ]}>
            {this.props.children}
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

export default connect(
  (state: AppState) => ({
    composedMessageMaxWidth: composedMessageMaxWidthSelector(state),
  }),
)(ComposedMessage);
