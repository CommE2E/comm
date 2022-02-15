// @flow

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

import Button from '../components/button.react';
import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-list.css';

type Props = {
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +renderStyle?: 'chat' | 'thread',
};
function ChatThreadListItemMenu(props: Props): React.Node {
  const { renderStyle = 'chat' } = props;
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

  const menuIconSize = renderStyle === 'chat' ? 24 : 16;

  let btn;
  if (menuVisible) {
    btn = (
      <Button variant="toggle_read" onClick={toggleUnreadStatus}>
        {toggleUnreadStatusButtonText}
      </Button>
    );
  }

  return (
    <div className={css.menu} onMouseLeave={hideMenu}>
      <button onClick={toggleMenu}>
        <SWMansionIcon icon="menu-vertical" size={menuIconSize} />
      </button>
      <div>{btn}</div>
    </div>
  );
}

export default ChatThreadListItemMenu;
