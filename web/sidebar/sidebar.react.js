// @flow

import * as React from 'react';

import css from './sidebar.css';

function SideBar(): React.Node {
  return (
    <aside className={css.container}>
      <h3>i am side bar</h3>
    </aside>
  );
}

export default SideBar;
