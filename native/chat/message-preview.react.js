// @flow

import {
  type MessageInfo,
  messageInfoPropType,
  messageTypes,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { messagePreviewText } from 'lib/shared/message-utils';
import {
  threadIsPersonalChat,
  threadIsTwoPersonChat,
} from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';

type Props = {|
  messageInfo: MessageInfo,
  threadInfo: ThreadInfo,
|};
class MessagePreview extends React.PureComponent<Props> {

  static propTypes = {
    messageInfo: messageInfoPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
  };

  render() {
    const messageInfo: MessageInfo = this.props.messageInfo;
    const unreadStyle = this.props.threadInfo.currentUser.unread
      ? styles.unread
      : null;
    if (messageInfo.type === messageTypes.TEXT) {
      let usernameText = null;
      if (
        !threadIsPersonalChat(this.props.threadInfo) &&
        !threadIsTwoPersonChat(this.props.threadInfo)
      ) {
        const userString = stringForUser(messageInfo.creator);
        const username = `${userString}: `;
        usernameText = (
          <Text style={[styles.username, unreadStyle]}>{username}</Text>
        );
      }
      return (
        <Text style={[styles.lastMessage, unreadStyle]} numberOfLines={1}>
          {usernameText}
          {messageInfo.text}
        </Text>
      );
    } else {
      const preview = messagePreviewText(messageInfo, this.props.threadInfo);
      return (
        <Text
          style={[styles.lastMessage, styles.preview, unreadStyle]}
          numberOfLines={1}
        >
          {preview}
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
  preview: {
    color: '#AAAAAA',
  },
  unread: {
    color: 'black',
  },
});

export default MessagePreview;
