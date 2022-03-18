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
  const previewCls = classNames(css.lastMessage, css.dark);
  const unread = props.threadInfo.currentUser.unread;
  const colorStyle = unread ? css.black : css.dark;
  const lastMsgCls = classNames(css.lastMessage, colorStyle);

  if (!props.messageInfo) {
    return <div className={previewCls}>No messages</div>;
  }
  const messageInfo: ComposableMessageInfo | RobotextMessageInfo =
    props.messageInfo.type === messageTypes.SIDEBAR_SOURCE
      ? props.messageInfo.sourceMessage
      : props.messageInfo;
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
      const usernameStyle = unread ? css.black : css.light;
      usernameText = <span className={usernameStyle}>{username}</span>;
    }
    return (
      <div className={lastMsgCls}>
        {usernameText}
        {messageTitle}
      </div>
    );
  } else {
    return <div className={lastMsgCls}>{messageTitle}</div>;
  }
}

export default MessagePreview;
