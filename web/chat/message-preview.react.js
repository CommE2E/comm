// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import { useThreadChatMentionCandidates } from 'lib/hooks/chat-mention-hooks.js';
import { useMessageInfoForPreview } from 'lib/hooks/message-hooks.js';
import { useMessagePreview } from 'lib/shared/message-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './chat-thread-list.css';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';

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

  if (!messagePreviewResult) {
    return (
      <div className={classNames(css.lastMessage, css.dark, css.italic)}>
        No messages
      </div>
    );
  }
  const { message, username } = messagePreviewResult;

  let usernameText = null;
  if (username) {
    let usernameStyle;
    if (username.style === 'unread') {
      usernameStyle = css.unread;
    } else if (username.style === 'secondary') {
      usernameStyle = css.messagePreviewSecondary;
    }
    invariant(
      usernameStyle,
      `MessagePreview doesn't support ${username.style} style for username, ` +
        'only unread and secondary',
    );
    usernameText = (
      <span className={usernameStyle}>{`${username.text}: `}</span>
    );
  }

  let messageStyle;
  if (message.style === 'unread') {
    messageStyle = css.unread;
  } else if (message.style === 'primary') {
    messageStyle = css.messagePreviewPrimary;
  } else if (message.style === 'secondary') {
    messageStyle = css.messagePreviewSecondary;
  }
  invariant(
    messageStyle,
    `MessagePreview doesn't support ${message.style} style for message, ` +
      'only unread, primary, and secondary',
  );

  return (
    <div className={classNames(css.lastMessage, messageStyle)}>
      {usernameText}
      {message.text}
    </div>
  );
}

export default MessagePreview;
