// @flow

import classNames from 'classnames';
import * as React from 'react';
import { useDispatch } from 'react-redux';

import Button from '../components/button.react';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import SWMansionIcon from '../SWMansionIcon.react';
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
  const isSettingsOpen = useSelector(state => state.navInfo.tab === 'settings');
  const settingsButtonContainerClass = classNames({
    [css.activeContainer]: isSettingsOpen,
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
  });

  return (
    <div className={css.container}>
      <a className={inboxButtonContainerClass} onClick={openChat}>
        <SWMansionIcon icon="inbox" size={36} />
      </a>
      <div className={css.spacer} />
      <div className={settingsButtonContainerClass}>
        <Button variant="round" onClick={openAccountSettings}>
          <SWMansionIcon icon="settings" size={22} />
        </Button>
      </div>
    </div>
  );
}

export default CommunityPicker;
