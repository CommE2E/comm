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
import { shortAbsoluteDate } from 'lib/utils/date-utils';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { useSelector } from '../redux/redux-utils';
import css from './chat-thread-list.css';

type Props = {
  +messageInfo: ?MessageInfo,
  +threadInfo: ThreadInfo,
  +lastUpdatedTimeIncludingSidebars: number,
};
function MessagePreview(props: Props): React.Node {
  const {
    messageInfo: messageInfoProps,
    threadInfo,
    lastUpdatedTimeIncludingSidebars,
  } = props;
  const { unread } = threadInfo.currentUser;

  let usernameText = null;
  const colorStyle = unread ? css.white : css.light;

  const timeZone = useSelector(state => state.timeZone);
  const lastActivity = shortAbsoluteDate(
    lastUpdatedTimeIncludingSidebars,
    timeZone,
  );

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
    <div className={classNames(css.lastMessage, colorStyle)}>
      {usernameText}
      {messageTitle}
      <span className={css.lastActivity}>{lastActivity}</span>
    </div>
  );
}

export default MessagePreview;
