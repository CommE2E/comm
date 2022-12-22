// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { getMessageTitle } from 'lib/shared/message-utils';
import { threadIsGroupChat } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import {
  type MessageInfo,
  messageTypes,
  type MessageType,
  type ComposableMessageInfo,
  type RobotextMessageInfo,
} from 'lib/types/message-types';
import type { ReactionMessageInfo } from 'lib/types/messages/reaction';
import { type ThreadInfo } from 'lib/types/thread-types';

import { SingleLine } from '../components/single-line.react';
import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { useStyles } from '../themes/colors';

type Props = {
  +messageInfo: MessageInfo,
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const messageInfo:
    | ComposableMessageInfo
    | RobotextMessageInfo
    | ReactionMessageInfo =
    props.messageInfo.type === messageTypes.SIDEBAR_SOURCE
      ? props.messageInfo.sourceMessage
      : props.messageInfo;
  const unreadStyle = props.threadInfo.currentUser.unread
    ? styles.unread
    : null;
  const messageTitle = getMessageTitle(
    messageInfo,
    props.threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );
  if (messageInfo.type === messageTypes.TEXT) {
    let usernameText = null;
    if (
      threadIsGroupChat(props.threadInfo) ||
      props.threadInfo.name !== '' ||
      messageInfo.creator.isViewer
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
        {messageTitle}
      </Text>
    );
  } else {
    const messageType: MessageType = messageInfo.type;
    invariant(
      messageType !== messageTypes.SIDEBAR_SOURCE,
      'Sidebar source should not be handled here',
    );
    return (
      <SingleLine style={[styles.lastMessage, styles.preview, unreadStyle]}>
        {messageTitle}
      </SingleLine>
    );
  }
}

const unboundStyles = {
  lastMessage: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 14,
  },
  preview: {
    color: 'listForegroundQuaternaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
  username: {
    color: 'listForegroundQuaternaryLabel',
  },
};

export default MessagePreview;
