// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './account-settings-button.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useNavigationSidebarTooltip } from '../utils/tooltip-action-utils.js';

function AccountSettingsButton(): React.Node {
  const dispatch = useDispatch();

  const openAccountSettings = React.useCallback(() => {
    dispatch({
      type: updateNavInfoActionType,
      payload: {
        tab: 'settings',
        settingsSection: 'account',
      },
    });
  }, [dispatch]);

  const { onMouseEnter, onMouseLeave } = useNavigationSidebarTooltip({
    tooltipLabel: 'Settings',
  });

  return (
    <div
      className={css.container}
      onClick={openAccountSettings}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SWMansionIcon icon="settings" size={20} />
    </div>
  );
}

export default AccountSettingsButton;
