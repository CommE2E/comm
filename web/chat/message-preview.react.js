// @flow

import classNames from 'classnames';
import * as React from 'react';

import { getMessagePreview } from 'lib/shared/message-utils';
import { type MessageInfo } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import css from './chat-thread-list.css';

type Props = {
  +messageInfo: ?MessageInfo,
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const {
    messageInfo: originalMessageInfo,
    threadInfo,
    threadInfo: {
      currentUser: { unread },
    },
  } = props;

  const colorStyle = unread ? css.unread : css.read;
  if (!originalMessageInfo) {
    return (
      <div className={classNames(css.lastMessage, css.dark, css.italic)}>
        No messages
      </div>
    );
  }

  const { message: messageTitle, username } = getMessagePreview(
    originalMessageInfo,
    threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );

  let usernameText = null;
  if (username) {
    usernameText = <span className={colorStyle}>{`${username}: `}</span>;
  }

  return (
    <div className={classNames(css.lastMessage, colorStyle)}>
      {usernameText}
      {messageTitle}
    </div>
  );
}

export default MessagePreview;
