// @flow

import * as React from 'react';

import AppSwitcher from './app-switcher.react';
import CommunityPicker from './community-picker.react';
import css from './left-layout-aside.css';

function LeftLayoutAside(): React.Node {
  return (
    <aside className={css.container}>
      <CommunityPicker />
      <AppSwitcher />
    </aside>
  );
}

export default LeftLayoutAside;
