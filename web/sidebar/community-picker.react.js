// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import CommunityDrawer from './community-drawer.react.js';
import css from './community-picker.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';

function CommunityPicker(): React.Node {
  const dispatch = useDispatch();

  const openAccountSettings = React.useCallback(
    (event: SyntheticEvent<HTMLButtonElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'settings', settingsSection: 'account' },
      });
    },
    [dispatch],
  );
  const isSettingsOpen = useSelector(state => state.navInfo.tab === 'settings');
  const settingsButtonContainerClass = classNames({
    [css.activeContainer]: isSettingsOpen,
    [css.inactiveContainer]: !isSettingsOpen,
  });

  const openChat = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'chat' },
      });
    },
    [dispatch],
  );
  const isInboxOpen = useSelector(
    state =>
      state.navInfo.tab === 'chat' ||
      state.navInfo.tab === 'apps' ||
      state.navInfo.tab === 'calendar',
  );
  const inboxButtonContainerClass = classNames({
    [css.activeContainer]: isInboxOpen,
    [css.inactiveContainer]: !isInboxOpen,
  });

  return (
    <div className={css.container}>
      <a className={inboxButtonContainerClass} onClick={openChat}>
        <SWMansionIcon icon="inbox" size={36} />
      </a>
      <div className={css.drawerWrapper}>
        <CommunityDrawer />
      </div>
      <div className={css.spacer} />
      <div className={settingsButtonContainerClass}>
        <a className={css.settingsIcon} onClick={openAccountSettings}>
          <SWMansionIcon icon="settings" size={22} />
        </a>
      </div>
    </div>
  );
}

export default CommunityPicker;
