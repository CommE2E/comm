// @flow

import * as React from 'react';

import CommunityPicker from './community-picker.react.js';
import css from './left-layout-aside.css';

function LeftLayoutAside(): React.Node {
  return (
    <aside className={css.container}>
      <CommunityPicker />
    </aside>
  );
}

const MemoizedLeftLayoutAside: React.ComponentType<{}> = React.memo<{}>(
  LeftLayoutAside,
);

export default MemoizedLeftLayoutAside;
