// @flow

import * as React from 'react';

import NavigationPanel from './navigation-panel.react';

function SettingsSwitcher(): React.Node {
  const accountSettingsNavigationItem = React.useMemo(
    () => (
      <p>
        <a>My Account</a>
      </p>
    ),
    [],
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
