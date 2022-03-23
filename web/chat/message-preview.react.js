// @flow

import classNames from 'classnames';
import * as React from 'react';

import { getMessageTitle } from 'lib/shared/message-utils';
import { threadIsGroupChat } from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import {
  type MessageInfo,
  messageTypes,
  type ComposableMessageInfo,
  type RobotextMessageInfo,
} from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import css from './chat-thread-list.css';

type Props = {
  +messageInfo: ?MessageInfo,
  +threadInfo: ThreadInfo,
};
function MessagePreview(props: Props): React.Node {
  const { messageInfo: messageInfoProps, threadInfo } = props;
  const { unread } = threadInfo.currentUser;

  let usernameText = null;
  const colorStyle = unread ? css.white : css.light;

  if (!messageInfoProps) {
    return (
      <div className={classNames(css.lastMessage, css.dark, css.italic)}>
        No messages
      </div>
    );
  }

  let messageInfo: ComposableMessageInfo | RobotextMessageInfo;
  if (messageInfoProps.type === messageTypes.SIDEBAR_SOURCE) {
    messageInfo = messageInfoProps.sourceMessage;
  } else {
    messageInfo = messageInfoProps;
  }

  const messageTitle = getMessageTitle(
    messageInfo,
    threadInfo,
    getDefaultTextMessageRules().simpleMarkdownRules,
  );

  const hasUsername =
    threadIsGroupChat(threadInfo) ||
    threadInfo.name !== '' ||
    messageInfo.creator.isViewer;

  if (messageInfo.type === messageTypes.TEXT && hasUsername) {
    const userString = stringForUser(messageInfo.creator);
    usernameText = <span className={colorStyle}>{`${userString}: `}</span>;
  }

  return (
    <div className={classNames([css.lastMessage, colorStyle])}>
      {usernameText}
      {messageTitle}
    </div>
  );
}

export default MessagePreview;
