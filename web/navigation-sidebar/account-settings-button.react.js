// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import css from './account-settings-button.css';
import { navigationSidebarLabelTooltipMargin } from './navigation-sidebar-constants.js';
import NavigationSidebarTabIndicator from './navigation-sidebar-tab-indicator.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { useLabelTooltip } from '../tooltips/tooltip-action-utils.js';
import { tooltipPositions } from '../tooltips/tooltip-utils.js';

function AccountSettingsButton(): React.Node {
  const dispatch = useDispatch();

  const openAccountSettings = React.useCallback(
    () =>
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          tab: 'settings',
          settingsSection: 'account',
        },
      }),
    [dispatch],
  );

  const { onMouseEnter, onMouseLeave } = useLabelTooltip({
    tooltipLabel: 'Settings',
    position: tooltipPositions.RIGHT,
    tooltipMargin: navigationSidebarLabelTooltipMargin,
  });

  return (
    <div>
      <NavigationSidebarTabIndicator isActive={false} />
      <div
        className={css.container}
        onClick={openAccountSettings}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <SWMansionIcon icon="settings" size={20} />
      </div>
    </div>
  );
}

export default AccountSettingsButton;
