// @flow

import invariant from 'invariant';
import * as React from 'react';
import { TouchableOpacity } from 'react-native';

import type { AppNavigationProp } from './app-navigator.react.js';
import CommunityDrawerButtonIcon from './community-drawer-button-icon.react.js';
import type { CommunityDrawerNavigationProp } from './community-drawer-navigator.react.js';
import type { NUXTipRouteNames } from './route-names.js';
import type { TabNavigationProp } from './tab-navigator.react.js';
import {
  NUXTipsContext,
  nuxTip,
} from '../components/nux-tips-context.react.js';

type Props = {
  +navigation:
    | TabNavigationProp<'Chat'>
    | TabNavigationProp<'Profile'>
    | TabNavigationProp<'Calendar'>
    | CommunityDrawerNavigationProp<'TabNavigator'>
    | AppNavigationProp<NUXTipRouteNames>,
  ...
};
function CommunityDrawerButton(props: Props): React.Node {
  const { navigation } = props;

  const tipsContext = React.useContext(NUXTipsContext);
  invariant(tipsContext, 'NUXTipsContext should be defined');
  const { registerTipButton } = tipsContext;

  React.useEffect(() => {
    return () => {
      registerTipButton(nuxTip.COMMUNITY_DRAWER, null);
      registerTipButton(nuxTip.COMMUNITY_DIRECTORY, null);
    };
  }, [registerTipButton]);

  return (
    <TouchableOpacity onPress={navigation.openDrawer}>
      <CommunityDrawerButtonIcon />
    </TouchableOpacity>
  );
}

export default CommunityDrawerButton;
