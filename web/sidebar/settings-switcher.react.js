// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { updateNavInfoActionType } from '../types/nav-types';
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
      <p>
        <a onClick={onClickAccountSettings}>My Account</a>
      </p>
    ),
    [onClickAccountSettings],
  );

  return (
    <NavigationPanel.Container>
      <NavigationPanel.Item tab="settings">
        {accountSettingsNavigationItem}
      </NavigationPanel.Item>
    </NavigationPanel.Container>
  );
}

export default SettingsSwitcher;
