// @flow

import * as React from 'react';

import AccountSettingsButton from './account-settings-button.react.js';
import CommunityCreationButton from './community-creation-button.react.js';
import CommunityList from './community-list.react.js';
import NavigationSidebarHomeButton from './navigation-sidebar-home-button.react.js';
import css from './navigation-sidebar.css';

function NavigationSidebar(): React.Node {
  return (
    <div className={css.container}>
      <NavigationSidebarHomeButton />
      <CommunityList />
      <div className={css.footer}>
        <CommunityCreationButton />
        <AccountSettingsButton />
      </div>
    </div>
  );
}

export default NavigationSidebar;
