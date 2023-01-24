// @flow

import classNames from 'classnames';
import invariant from 'invariant';
import * as React from 'react';

import { useMessagePreview } from 'lib/shared/message-utils';
import { type MessageInfo } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import css from './chat-thread-list.css';

type Props = {
  +messageInfo: ?MessageInfo,
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const { messageInfo, threadInfo } = props;
  const messagePreviewResult = useMessagePreview(
    messageInfo,
    threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );

  if (!messageInfo) {
    return (
      <div className={classNames(css.lastMessage, css.dark, css.italic)}>
        No messages
      </div>
    );
  }
  invariant(
    messagePreviewResult,
    'useMessagePreview should only return falsey if pass null or undefined',
  );
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
