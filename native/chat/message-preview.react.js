// @flow

import type { MessageInfo } from 'lib/types/message-types';
import { messageInfoPropType } from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { messageType } from 'lib/types/message-types';
import {
  robotextForMessageInfo,
  robotextToRawString,
} from 'lib/shared/message-utils';

type Props = {
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
};
class MessagePreview extends React.PureComponent<Props> {

  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
  };

  render() {
    const messageInfo: MessageInfo = this.props.messageInfo;
    const username = messageInfo.creator.isViewer
      ? "you: "
      : `${messageInfo.creator.username || ""}: `;
    const unreadStyle = this.props.threadInfo.currentUser.unread
      ? styles.unread
      : null;
    if (messageInfo.type === messageType.TEXT) {
      return (
        <Text style={[styles.lastMessage, unreadStyle]} numberOfLines={1}>
          <Text style={[styles.username, unreadStyle]}>{username}</Text>
          {messageInfo.text}
        </Text>
      );
    } else {
      const robotext = robotextToRawString(robotextForMessageInfo(
        messageInfo,
        this.props.threadInfo,
      ));
      return (
        <Text
          style={[styles.lastMessage, styles.robotext, unreadStyle]}
          numberOfLines={1}
        >
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
  unread: {
    color: 'black',
  },
});

export default MessagePreview;
