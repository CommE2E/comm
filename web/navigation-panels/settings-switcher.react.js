// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import NavigationPanel from './navigation-panel.react.js';
import css from './settings-switcher.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { navSettingsSectionSelector } from '../selectors/nav-selectors.js';

function SettingsSwitcher(): React.Node {
  const dispatch = useDispatch();

  const onClickAccountSettings = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'settings', settingsSection: 'account' },
      });
    },
    [dispatch],
  );
  const accountSettingsNavigationItem = React.useMemo(
    () => (
      <a className={css.navigationPanelTab} onClick={onClickAccountSettings}>
        <p>My Account</p>
      </a>
    ),
    [onClickAccountSettings],
  );

  const onClickDangerZone = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'settings', settingsSection: 'danger-zone' },
      });
    },
    [dispatch],
  );
  const dangerZoneNavigationItem = React.useMemo(
    () => (
      <a className={css.navigationPanelTab} onClick={onClickDangerZone}>
        <p>Danger Zone</p>
      </a>
    ),
    [onClickDangerZone],
  );

  return (
    <NavigationPanel.Container tabSelector={navSettingsSectionSelector}>
      <NavigationPanel.Item tab="account">
        {accountSettingsNavigationItem}
      </NavigationPanel.Item>
      <NavigationPanel.Item tab="danger-zone">
        {dangerZoneNavigationItem}
      </NavigationPanel.Item>
    </NavigationPanel.Container>
  );
}

export default SettingsSwitcher;
