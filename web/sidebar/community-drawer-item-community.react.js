// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './community-drawer-item.css';
import CommunityDrawerItem from './community-drawer-item.react';
import type { DrawerItemProps } from './community-drawer-item.react';

function CommunityDrawerItemCommunity(props: DrawerItemProps): React.Node {
  const classes = classnames({
    [css.communityBase]: true,
    [css.communityExpanded]: props.expanded,
  });
  return (
    <div className={classes}>
      <CommunityDrawerItem {...props} />
    </div>
  );
}

const MemoizedCommunityDrawerItemCommunity: React.ComponentType<DrawerItemProps> = React.memo(
  CommunityDrawerItemCommunity,
);
export default MemoizedCommunityDrawerItemCommunity;
