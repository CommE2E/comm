// @flow

import * as React from 'react';

import type { NavInfo } from '../types/nav-types';
import css from './topbar.css';

type Props = {
  +navInfo: NavInfo,
};
function Topbar(props: Props): React.Node {
  const { navInfo } = props;
  if (navInfo.tab === 'settings') {
    return null;
  }

  return <div className={css.container}>dummy</div>;
}

const MemoizedTopbar: React.ComponentType<Props> = React.memo<Props>(Topbar);

export default MemoizedTopbar;
