// @flow

import * as React from 'react';

import { useDispatch } from 'lib/utils/redux-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import NavigationPanel from './navigation-panel.react.js';
import css from './settings-switcher.css';
import { updateNavInfoActionType } from '../redux/action-types.js';
import { navSettingsSectionSelector } from '../selectors/nav-selectors.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

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

  const staffCanSee = useStaffCanSee();

  const onClickKeyservers = React.useCallback(
    (event: SyntheticEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: { tab: 'settings', settingsSection: 'keyservers' },
      });
    },
    [dispatch],
  );

  const keyserversNavigationItem = React.useMemo(() => {
    if (!staffCanSee) {
      return null;
    }
    return (
      <a className={css.navigationPanelTab} onClick={onClickKeyservers}>
        <p>Keyservers</p>
      </a>
    );
  }, [onClickKeyservers, staffCanSee]);

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
  const dangerZoneNavigationItem = React.useMemo(() => {
    // Once we're using the identity service for auth, a user may only delete
    // their Comm account using their primary device. Their primary device
    // cannot be a web device at this time, so we hide the Danger Zone from web
    // users.
    if (usingCommServicesAccessToken) {
      return null;
    }
    return (
      <a className={css.navigationPanelTab} onClick={onClickDangerZone}>
        <p>Danger Zone</p>
      </a>
    );
  }, [onClickDangerZone]);

  return (
    <NavigationPanel.Container tabSelector={navSettingsSectionSelector}>
      <NavigationPanel.Item tab="account">
        {accountSettingsNavigationItem}
      </NavigationPanel.Item>
      <NavigationPanel.Item tab="keyservers">
        {keyserversNavigationItem}
      </NavigationPanel.Item>
      <NavigationPanel.Item tab="danger-zone">
        {dangerZoneNavigationItem}
      </NavigationPanel.Item>
    </NavigationPanel.Container>
  );
}

export default SettingsSwitcher;
