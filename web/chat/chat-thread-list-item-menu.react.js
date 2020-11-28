// @flow

import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';
import type { ChatThreadItem } from 'lib/selectors/chat-selectors';

import * as React from 'react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';
import {
  setThreadUnreadStatusActionTypes,
  setThreadUnreadStatus,
} from 'lib/actions/activity-actions';

import css from './chat-thread-list.css';

type Props = {|
  +item: ChatThreadItem,
|};
function ChatThreadListItemMenu(props: Props) {
  const [menuVisible, setMenuVisible] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setMenuVisible(!menuVisible);
  }, [menuVisible]);

  const hideMenu = React.useCallback(() => {
    setMenuVisible(false);
  }, []);

  const { threadInfo, mostRecentNonLocalMessage } = props.item;
  const dispatchActionPromise = useDispatchActionPromise();
  const boundSetThreadUnreadStatus: (
    request: SetThreadUnreadStatusRequest,
  ) => Promise<SetThreadUnreadStatusPayload> = useServerCall(
    setThreadUnreadStatus,
  );
  const toggleUnreadStatus = React.useCallback(() => {
    const { unread } = threadInfo.currentUser;
    const request = {
      threadID: threadInfo.id,
      unread: !unread,
      latestMessage: mostRecentNonLocalMessage,
    };
    dispatchActionPromise(
      setThreadUnreadStatusActionTypes,
      boundSetThreadUnreadStatus(request),
      undefined,
      {
        threadID: threadInfo.id,
        unread: !unread,
      },
    );
    hideMenu();
  }, [
    threadInfo,
    mostRecentNonLocalMessage,
    dispatchActionPromise,
    hideMenu,
    boundSetThreadUnreadStatus,
  ]);

  const toggleUnreadStatusButtonText = `Mark as ${
    threadInfo.currentUser.unread ? 'read' : 'unread'
  }`;
  return (
    <div className={css.menu} onMouseLeave={hideMenu}>
      <button onClick={toggleMenu}>
        <FontAwesomeIcon icon={faEllipsisV} />
      </button>
      <div
        className={classNames(css.menuContent, {
          [css.menuContentVisible]: menuVisible,
        })}
      >
        <ul>
          <li>
            <button onClick={toggleUnreadStatus}>
              {toggleUnreadStatusButtonText}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ChatThreadListItemMenu;
