// @flow

import { faBell, faCog } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import { type ThreadInfo } from 'lib/types/thread-types';

import SWMansionIcon from '../SWMansionIcon.react';
import ThreadMenuItem from './thread-menu-item.react';
import css from './thread-menu.css';

type ThreadMenuProps = {
  +threadInfo: ThreadInfo,
};

function ThreadMenu(props: ThreadMenuProps): React.Node {
  const [isOpen, setIsOpen] = React.useState(false);

  // eslint-disable-next-line no-unused-vars
  const { threadInfo } = props;

  const menuItems = React.useMemo(() => {
    const settingsItem = (
      <ThreadMenuItem key="settings" text="Settings" icon={faCog} />
    );
    const notificationsItem = (
      <ThreadMenuItem key="notifications" text="Notifications" icon={faBell} />
    );
    const items = [settingsItem, notificationsItem];
    return items.filter(Boolean);
  }, []);

  const closeMenuCallback = React.useCallback(() => {
    document.removeEventListener('click', closeMenuCallback);
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!document || !isOpen) {
      return undefined;
    }
    document.addEventListener('click', closeMenuCallback);
    return () => document.removeEventListener('click', closeMenuCallback);
  }, [closeMenuCallback, isOpen]);

  const switchMenuCallback = React.useCallback(() => {
    setIsOpen(isMenuOpen => !isMenuOpen);
  }, []);

  if (menuItems.length === 0) {
    return null;
  }

  let menuActionList = null;
  if (isOpen) {
    menuActionList = (
      <div className={css.topBarMenuActionList}>{menuItems}</div>
    );
  }

  return (
    <div>
      <button className={css.topBarMenuButton} onClick={switchMenuCallback}>
        <SWMansionIcon icon="menu-vertical" size={20} />
      </button>
      {menuActionList}
    </div>
  );
}

export default ThreadMenu;
