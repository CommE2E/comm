// @flow

import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import {
  setThreadUnreadStatusActionTypes,
  setThreadUnreadStatus,
} from 'lib/actions/activity-actions';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from 'lib/types/activity-types';
import type { ThreadInfo } from 'lib/types/thread-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import css from './chat-thread-list.css';

type Props = {|
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
|};
function ChatThreadListItemMenu(props: Props): React.Node {
  const [menuVisible, setMenuVisible] = React.useState(false);

  const toggleMenu = React.useCallback(() => {
    setMenuVisible(!menuVisible);
  }, [menuVisible]);

  const hideMenu = React.useCallback(() => {
    setMenuVisible(false);
  }, []);

  const { threadInfo, mostRecentNonLocalMessage } = props;
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
