// @flow

import * as React from 'react';

import AppSwitcher from './app-switcher.react';
import CommunityPicker from './community-picker.react';
import css from './sidebar.css';

function SideBar(): React.Node {
  return (
    <aside className={css.container}>
      <CommunityPicker />
      <AppSwitcher />
    </aside>
  );
}

export default SideBar;
