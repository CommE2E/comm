// @flow

import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';

import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text } from 'react-native';

import { messageType } from 'lib/types/message-types';
import { robotextForMessageInfo } from 'lib/shared/message-utils';

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
      const [actor, robotext] = robotextForMessageInfo(messageInfo);
      return (
        <Text style={[styles.lastMessage, styles.robotext]} numberOfLines={1}>
          {actor}
          {" "}
          {robotext}
        </Text>
      );
    }
  }

}

const styles = StyleSheet.create({
  lastMessage: {
    flex: 1,
    paddingLeft: 10,
    fontSize: 16,
    color: '#666666',
  },
  username: {
    color: '#AAAAAA',
  },
  robotext: {
    color: '#AAAAAA',
  },
});

export default MessagePreview;
