// @flow

import * as React from 'react';

import css from './topbar.css';

function Topbar(): React.Node {
  return <div className={css.container}>dummy</div>;
}

const MemoizedTopbar: React.ComponentType<{}> = React.memo<{}>(Topbar);

export default MemoizedTopbar;
