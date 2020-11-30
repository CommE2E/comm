// @flow

import type { ChatThreadItem } from 'lib/selectors/chat-selectors';
import { updateNavInfoActionType } from '../redux/redux-setup';

import * as React from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';

import { shortAbsoluteDate } from 'lib/utils/date-utils';

import css from './chat-thread-list.css';
import MessagePreview from './message-preview.react';
import ChatThreadListItemMenu from './chat-thread-list-item-menu.react';
import { useSelector } from '../redux/redux-utils';

type Props = {|
  +item: ChatThreadItem,
|};
function ChatThreadListItem(props: Props) {
  const { item } = props;
  const threadID = item.threadInfo.id;

  const dispatch = useDispatch();
  const onClick = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          activeChatThreadID: threadID,
        },
      });
    },
    [dispatch, threadID],
  );

  const timeZone = useSelector((state) => state.timeZone);
  const lastActivity = shortAbsoluteDate(item.lastUpdatedTime, timeZone);

  const active = useSelector(
    (state) => threadID === state.navInfo.activeChatThreadID,
  );
  const activeStyle = active ? css.activeThread : null;

  const colorSplotchStyle = { backgroundColor: `#${item.threadInfo.color}` };
  const unread = item.threadInfo.currentUser.unread;
  return (
    <div className={classNames(css.thread, activeStyle)}>
      <a className={css.threadButton} onClick={onClick}>
        <div className={css.threadRow}>
          <div className={css.title}>{item.threadInfo.uiName}</div>
          <div className={css.colorSplotch} style={colorSplotchStyle} />
        </div>
        <div className={css.threadRow}>
          <MessagePreview
            messageInfo={item.mostRecentMessageInfo}
            threadInfo={item.threadInfo}
          />
          <div
            className={classNames([
              css.lastActivity,
              unread ? css.black : css.dark,
            ])}
          >
            {lastActivity}
          </div>
        </div>
      </a>
      <ChatThreadListItemMenu item={item} />
    </div>
  );
}

export default ChatThreadListItem;
