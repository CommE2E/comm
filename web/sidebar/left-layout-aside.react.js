// @flow

import * as React from 'react';

import CommunityPicker from './community-picker.react';
import css from './left-layout-aside.css';
import NavigationPanel from './navigation-panel.react';

function LeftLayoutAside(): React.Node {
  return (
    <aside className={css.container}>
      <CommunityPicker />
      <NavigationPanel />
    </aside>
  );
}

export default LeftLayoutAside;
