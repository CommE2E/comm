// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import { useThreadChatMentionCandidates } from 'lib/hooks/chat-mention-hooks.js';
import { useMessageInfoForPreview } from 'lib/hooks/message-hooks.js';
import { useMessagePreview } from 'lib/shared/message-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import SingleLine from '../components/single-line.react.js';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const { threadInfo } = props;

  const chatMentionCandidates = useThreadChatMentionCandidates(threadInfo);
  const messageInfoForPreview = useMessageInfoForPreview(threadInfo);
  const messagePreviewResult = useMessagePreview(
    messageInfoForPreview,
    threadInfo,
    getDefaultTextMessageRules(chatMentionCandidates).simpleMarkdownRules,
  );
  const styles = useStyles(unboundStyles);
  if (!messagePreviewResult) {
    return (
      <Text style={styles.noMessages} numberOfLines={1}>
        No messages
      </Text>
    );
  }
  const { message, username } = messagePreviewResult;

  let messageStyle;
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
    color: 'listForegroundTertiaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
  noMessages: {
    color: 'listForegroundTertiaryLabel',
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
  },
};

export default MessagePreview;
