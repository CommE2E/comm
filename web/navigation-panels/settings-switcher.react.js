// @flow

import * as React from 'react';

import { useDispatch } from 'lib/utils/redux-utils.js';

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

  return (
    <NavigationPanel.Container tabSelector={navSettingsSectionSelector}>
      <NavigationPanel.Item tab="account">
        {accountSettingsNavigationItem}
      </NavigationPanel.Item>
      <NavigationPanel.Item tab="keyservers">
        {keyserversNavigationItem}
      </NavigationPanel.Item>
    </NavigationPanel.Container>
  );
}

export default SettingsSwitcher;
