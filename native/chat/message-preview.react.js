// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { useMessagePreview } from 'lib/shared/message-utils';
import { type MessageInfo } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { SingleLine } from '../components/single-line.react';
import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { useStyles } from '../themes/colors';

type Props = {
  +messageInfo: MessageInfo,
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const { messageInfo, threadInfo } = props;
  const messagePreviewResult = useMessagePreview(
    messageInfo,
    threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );
  invariant(
    messagePreviewResult,
    'useMessagePreview should only return falsey if pass null or undefined',
  );
  const { message, username } = messagePreviewResult;

  let messageStyle;
  const styles = useStyles(unboundStyles);
  if (message.style === 'unread') {
    messageStyle = styles.unread;
  } else if (message.style === 'primary') {
    messageStyle = styles.primary;
  } else if (message.style === 'secondary') {
    messageStyle = styles.secondary;
  }
  invariant(
    messageStyle,
    `MessagePreview doesn't support ${message.style} style for message, ` +
      'only unread, primary, and secondary',
  );

  if (!username) {
    return (
      <SingleLine style={[styles.lastMessage, messageStyle]}>
        {message.text}
      </SingleLine>
    );
  }

  let usernameStyle;
  if (username.style === 'unread') {
    usernameStyle = styles.unread;
  } else if (username.style === 'secondary') {
    usernameStyle = styles.secondary;
  }
  invariant(
    usernameStyle,
    `MessagePreview doesn't support ${username.style} style for username, ` +
      'only unread and secondary',
  );
  return (
    <Text style={[styles.lastMessage, messageStyle]} numberOfLines={1}>
      <Text style={usernameStyle}>{`${username.text}: `}</Text>
      {message.text}
    </Text>
  );
}

const unboundStyles = {
  lastMessage: {
    flex: 1,
    fontSize: 14,
  },
  primary: {
    color: 'listForegroundTertiaryLabel',
  },
  secondary: {
    color: 'listForegroundQuaternaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
};

export default MessagePreview;
