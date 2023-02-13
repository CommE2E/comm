// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import {
  clearCalendarCommunityFilter,
  updateNavInfoActionType,
} from '../redux/action-types';
import { useSelector } from '../redux/redux-utils.js';
import CommunityDrawer from './community-drawer.react';
import css from './community-picker.css';

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

  const isCalendarOpen = useSelector(state => state.navInfo.tab === 'calendar');
  const onPressInbox = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (isCalendarOpen) {
        dispatch({
          type: clearCalendarCommunityFilter,
        });
      } else {
        dispatch({
          type: updateNavInfoActionType,
          payload: { tab: 'chat' },
        });
      }
    },
    [dispatch, isCalendarOpen],
  );

  const inboxButtonTitle = isCalendarOpen ? 'All communities' : 'Inbox';

  const isInboxOpen = useSelector(
    state =>
      state.navInfo.tab === 'chat' ||
      state.navInfo.tab === 'apps' ||
      state.navInfo.tab === 'calendar',
  );
  const inboxButtonContainerClass = classNames({
    [css.itemContainer]: true,
    [css.activeItemContainer]: isInboxOpen,
  });
  const isSettingsOpen = useSelector(state => state.navInfo.tab === 'settings');
  const settingsButtonContainerClass = classNames({
    [css.itemContainer]: true,
    [css.activeItemContainer]: isSettingsOpen,
  });

  const sideLineInbox = classNames({
    [css.sideLine]: true,
    [css.sideLineActive]: isInboxOpen,
  });
  const sideLineSettings = classNames({
    [css.sideLine]: true,
    [css.sideLineActive]: isSettingsOpen,
  });

  return (
    <div className={css.container}>
      <div className={css.header}>
        <a className={inboxButtonContainerClass} onClick={onPressInbox}>
          <div className={sideLineInbox} />
          <SWMansionIcon icon="inbox" size={24} />
          <div className={css.buttonTitle}> {inboxButtonTitle} </div>
        </a>
      </div>
      <div className={css.drawerWrapper}>
        <CommunityDrawer />
      </div>
      <div className={css.spacer} />
      <div className={css.footer}>
        <a
          className={settingsButtonContainerClass}
          onClick={openAccountSettings}
        >
          <div className={sideLineSettings} />
          <div className={css.settingsIcon} onClick={openAccountSettings}>
            <SWMansionIcon icon="settings" size={22} />
          </div>
          <div className={css.buttonTitle}>Settings</div>
        </a>
      </div>
    </div>
  );
}

export default CommunityPicker;
