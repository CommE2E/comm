// @flow

import * as React from 'react';

import AppSwitcher from './app-switcher.react';
import css from './sidebar.css';

function SideBar(): React.Node {
  return (
    <aside className={css.container}>
      <AppSwitcher />
    </aside>
  );
}

export default SideBar;
