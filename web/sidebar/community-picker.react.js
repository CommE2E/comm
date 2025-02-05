// @flow

import classNames from 'classnames';
import * as React from 'react';

import {
  clearCalendarCommunityFilter,
  clearChatCommunityFilter,
} from 'lib/actions/community-actions.js';
import { useDebugLogs } from 'lib/components/debug-logs-context.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { unreadCount } from 'lib/selectors/thread-selectors.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import CommunityCreationModal from './community-creation/community-creation-modal.react.js';
import CommunityDrawer from './community-drawer.react.js';
import css from './community-picker.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

function CommunityPicker(): React.Node {
  const dispatch = useDispatch();
  const modalContext = useModalContext();

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

  const onPressCommunityCreationButton = React.useCallback(() => {
    modalContext.pushModal(<CommunityCreationModal />);
  }, [modalContext]);

  const communityCreationButton = (
    <a className={css.itemContainer} onClick={onPressCommunityCreationButton}>
      <div className={css.sideLine} />
      <div className={css.plusIcon}>
        <SWMansionIcon icon="plus-small" size={26} />
      </div>
      <div className={css.buttonTitle}>Create community</div>
    </a>
  );

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

  const staffCanSee = useStaffCanSee();
  const debugLogs = useDebugLogs();
  let logsBadge = null;
  if (staffCanSee && debugLogs.logs.length > 0) {
    logsBadge = (
      <div className={css.settingsBadge}>{debugLogs.logs.length}</div>
    );
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
        {communityCreationButton}
        <a className={css.itemContainer} onClick={openAccountSettings}>
          <div className={sideLineSettings} />
          <div className={css.settingsIcon} onClick={openAccountSettings}>
            <SWMansionIcon icon="settings" size={22} />
            {logsBadge}
          </div>
          <div className={css.buttonTitle}>Settings</div>
        </a>
      </div>
    </div>
  );
}

export default CommunityPicker;
