// @flow

import classNames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import useToggleUnreadStatus from 'lib/hooks/toggle-unread-status.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import css from './chat-thread-list-item-menu.css';
import Button from '../components/button.react.js';
import { useThreadIsActive } from '../selectors/thread-selectors.js';

type Props = {
  +threadInfo: ThreadInfo,
  +mostRecentNonLocalMessage: ?string,
  +renderStyle?: 'chat' | 'thread',
};
function ChatThreadListItemMenu(props: Props): React.Node {
  const { renderStyle = 'chat', threadInfo, mostRecentNonLocalMessage } = props;
  const active = useThreadIsActive(threadInfo.id);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const toggleMenu = React.useCallback(
    event => {
      event.stopPropagation();
      setMenuVisible(!menuVisible);
    },
    [menuVisible],
  );

  const hideMenu = React.useCallback(() => {
    setMenuVisible(false);
  }, []);

  const toggleUnreadStatus = useToggleUnreadStatus(
    threadInfo,
    mostRecentNonLocalMessage,
    hideMenu,
  );

  const onToggleUnreadStatusClicked = React.useCallback(
    event => {
      event.stopPropagation();
      toggleUnreadStatus();
    },
    [toggleUnreadStatus],
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
    [css.active]: active,
  });
  return (
    <div className={menuCls} onMouseLeave={hideMenu}>
      <Button onClick={toggleMenu}>
        <SWMansionIcon icon="menu-vertical" size={menuIconSize} />
      </Button>
      <div>
        <Button className={btnCls} onClick={onToggleUnreadStatusClicked}>
          <SWMansionIcon className={css.mailIcon} icon="mail" size={18} />
          {toggleUnreadStatusButtonText}
        </Button>
      </div>
    </div>
  );
}

export default ChatThreadListItemMenu;
