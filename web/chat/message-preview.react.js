// @flow

import {
  type MessageInfo,
  messageInfoPropType,
  messageTypes,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import classNames from 'classnames';

import { messagePreviewText } from 'lib/shared/message-utils';
import {
  threadIsPersonalChat,
  threadIsTwoPersonChat,
} from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';

import css from './chat-thread-list.css';

type Props = {|
  messageInfo: ?MessageInfo,
  threadInfo: ThreadInfo,
|};
class MessagePreview extends React.PureComponent<Props> {

  static propTypes = {
    messageInfo: messageInfoPropType,
    threadInfo: threadInfoPropType.isRequired,
  };

  render() {
    const messageInfo = this.props.messageInfo;
    if (!messageInfo) {
      return (
        <div className={classNames(css.lastMessage, css.dark, css.italic)}>
          No messages
        </div>
      );
    }
    const unread = this.props.threadInfo.currentUser.unread;
    if (messageInfo.type === messageTypes.TEXT) {
      let usernameText = null;
      if (
        !threadIsPersonalChat(this.props.threadInfo) &&
        !threadIsTwoPersonChat(this.props.threadInfo)
      ) {
        const userString = stringForUser(messageInfo.creator);
        const username = `${userString}: `;
        const usernameStyle = unread ? css.black : css.light;
        usernameText = <span className={usernameStyle}>{username}</span>;
      }
      const colorStyle = unread ? css.black : css.dark;
      return (
        <div className={classNames(css.lastMessage, colorStyle)}>
          {usernameText}
          {messageInfo.text}
        </div>
      );
    } else {
      const preview = messagePreviewText(messageInfo, this.props.threadInfo);
      const colorStyle = unread ? css.black : css.light;
      return (
        <div
          className={classNames([css.lastMessage, colorStyle])}
        >
          {preview}
        </div>
      );
    }
  }

}

export default MessagePreview;
