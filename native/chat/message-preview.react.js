// @flow

import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text } from 'react-native';

import { messageType } from 'lib/types/message-types';

class MessagePreview extends React.PureComponent {

  props: {
    messageInfo: MessageInfo,
  };
  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
  };

  render() {
    const messageInfo: MessageInfo = this.props.messageInfo;
    const username = messageInfo.isViewer
      ? "you: "
      : `${messageInfo.creator || ""}: `;
    if (messageInfo.type === messageType.TEXT) {
      return (
        <Text style={styles.lastMessage} numberOfLines={1}>
          <Text style={styles.username}>{username}</Text>
          {messageInfo.text}
        </Text>
      );
    } else {
      // TODO actually handle all cases
      return (
        <Text style={styles.lastMessage} numberOfLines={1}>
          Test
        </Text>
      );
    }
  }

}

const styles = StyleSheet.create({
  lastMessage: {
    paddingLeft: 10,
    fontSize: 16,
    color: '#666666',
  },
  username: {
    color: '#AAAAAA',
  },
});

export default MessagePreview;
