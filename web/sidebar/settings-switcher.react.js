// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateNavInfoActionType } from '../redux/action-types';
import { navSettingsSectionSelector } from '../selectors/nav-selectors.js';
import css from './left-layout-aside.css';
import NavigationPanel from './navigation-panel.react';

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
      <div className={css.navigationPanelTab} onClick={onClickAccountSettings}>
        <p>My Account</p>
      </div>
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
      <div className={css.navigationPanelTab} onClick={onClickDangerZone}>
        <p>Danger Zone</p>
      </div>
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
