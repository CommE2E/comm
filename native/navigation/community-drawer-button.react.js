// @flow

import Icon from '@expo/vector-icons/Feather.js';
import invariant from 'invariant';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import type { CommunityDrawerNavigationProp } from './community-drawer-navigator.react.js';
import type { TabNavigationProp } from './tab-navigator.react.js';
import {
  NUXTipsContext,
  nuxTip,
} from '../components/nux-tips-context.react.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation:
    | TabNavigationProp<'Chat'>
    | TabNavigationProp<'Profile'>
    | TabNavigationProp<'Calendar'>
    | CommunityDrawerNavigationProp<'TabNavigator'>,
};
function CommunityDrawerButton(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { navigation } = props;

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');
  const { registerTipButton } = tipsContext;

  React.useEffect(() => {
    return () => {
      registerTipButton(nuxTip.COMMUNITY_DRAWER, null);
    };
  }, [registerTipButton]);

  return (
    <TouchableOpacity onPress={navigation.openDrawer}>
      <Icon name="menu" size={26} style={styles.drawerButton} />
    </TouchableOpacity>
  );
}

const unboundStyles = {
  drawerButton: {
    color: 'listForegroundSecondaryLabel',
    marginLeft: 16,
  },
};

export default CommunityDrawerButton;
