// @flow

import * as React from 'react';

import css from './sidebar.css';

function AppSwitcher(): React.Node {
  return (
    <div className={css.container}>
      <ul>
        <li>
          <p>Calendar</p>
        </li>
        <li>
          <p>Chat</p>
        </li>
      </ul>
    </div>
  );
}

export default AppSwitcher;
