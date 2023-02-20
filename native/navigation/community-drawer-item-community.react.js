// @flow

import * as React from 'react';
import { View } from 'react-native';

import CommunityDrawerItem from './community-drawer-item.react.js';
import type { DrawerItemProps } from './community-drawer-item.react.js';
import { useStyles } from '../themes/colors.js';

function CommunityDrawerItemCommunity(props: DrawerItemProps): React.Node {
  const styles = useStyles(unboundStyles);

  const style = React.useMemo(
    () =>
      props.expanded
        ? [styles.communityExpanded, styles.communityBase]
        : styles.communityBase,
    [props.expanded, styles.communityBase, styles.communityExpanded],
  );

  return (
    <View style={style}>
      <CommunityDrawerItem {...props} />
    </View>
  );
}

const unboundStyles = {
  communityBase: {
    paddingVertical: 2,
    paddingRight: 24,
    paddingLeft: 8,
    overflow: 'hidden',
  },
  communityExpanded: {
    backgroundColor: 'drawerOpenCommunityBackground',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
};

const MemoizedCommunityDrawerItemCommunity: React.ComponentType<DrawerItemProps> =
  React.memo(CommunityDrawerItemCommunity);
export default MemoizedCommunityDrawerItemCommunity;
