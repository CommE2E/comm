// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { unreadCount } from 'lib/selectors/thread-selectors.js';

import CommunityDrawer from './community-drawer.react.js';
import css from './community-picker.css';
import {
  clearCalendarCommunityFilter,
  updateNavInfoActionType,
  clearChatCommunityFilter,
} from '../redux/action-types.js';
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
        dispatch({
          type: clearChatCommunityFilter,
        });
      }
    },
    [dispatch, isCalendarOpen],
  );

  const inboxButtonTitle = isCalendarOpen ? 'All communities' : 'Inbox';

  const isInboxOpen = useSelector(
    state => state.navInfo.tab === 'chat' || state.navInfo.tab === 'calendar',
  );
  const isSettingsOpen = useSelector(state => state.navInfo.tab === 'settings');

  const sideLineInbox = classNames({
    [css.sideLine]: true,
    [css.sideLineActive]: isInboxOpen,
  });
  const sideLineSettings = classNames({
    [css.sideLine]: true,
    [css.sideLineActive]: isSettingsOpen,
  });

  const boundUnreadCount = useSelector(unreadCount);
  let chatBadge = null;
  if (boundUnreadCount > 0 && !isCalendarOpen) {
    if (boundUnreadCount < 100) {
      chatBadge = <span className={css.chatBadge}>{boundUnreadCount}</span>;
    } else {
      const classes = classNames(css.chatBadge, css.chatBadgePlus);
      chatBadge = <span className={classes}>99+</span>;
    }
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <a className={css.itemContainer} onClick={onPressInbox}>
          <div className={sideLineInbox} />
          <SWMansionIcon icon="inbox" size={24} />
          <div className={css.buttonTitle}> {inboxButtonTitle} </div>
          <div className={css.spacer} />
          {chatBadge}
        </a>
      </div>
      <div className={css.drawerWrapper}>
        <CommunityDrawer />
      </div>
      <div className={css.spacer} />
      <div className={css.footer}>
        <a className={css.itemContainer} onClick={openAccountSettings}>
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
