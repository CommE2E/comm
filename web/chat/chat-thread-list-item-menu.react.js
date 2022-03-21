// @flow

import classNames from 'classnames';
import * as React from 'react';

import useToggleUnreadStatus from 'lib/hooks/toggle-unread-status';
import type { ThreadInfo } from 'lib/types/thread-types';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './chat-thread-list-item-menu.css';

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
  const toggleUnreadStatus = useToggleUnreadStatus(
    threadInfo,
    mostRecentNonLocalMessage,
    hideMenu,
  );
  const toggleUnreadStatusButtonText = `Mark as ${
    threadInfo.currentUser.unread ? 'read' : 'unread'
  }`;

  const menuIconSize = renderStyle === 'chat' ? 24 : 20;
  const menuCls = classNames(css.menu, {
    [css.menuSidebar]: renderStyle === 'thread',
  });
  const btnCls = classNames(css.menuContent, {
    [css.menuContentVisible]: menuVisible,
  });
  return (
    <div className={menuCls} onMouseLeave={hideMenu}>
      <button onClick={toggleMenu}>
        <SWMansionIcon icon="menu-vertical" size={menuIconSize} />
      </button>
      <div>
        <button className={btnCls} onClick={toggleUnreadStatus}>
          {toggleUnreadStatusButtonText}
        </button>
      </div>
    </div>
  );
}

export default ChatThreadListItemMenu;
