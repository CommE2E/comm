// @flow

import {
  createDrawerNavigator,
  type DrawerNavigationHelpers,
  type DrawerNavigationProp,
} from '@react-navigation/drawer';
import * as React from 'react';
import { View } from 'react-native';

import { useStyles } from '../themes/colors';
import type { AppNavigationProp } from './app-navigator.react';
import CommunityDrawerContent from './community-drawer-content.react';
import { drawerSwipeEnabledSelector } from './nav-selectors';
import { NavContext } from './navigation-context';
import { TabNavigatorRouteName } from './route-names';
import type {
  NavigationRoute,
  ScreenParamList,
  CommunityDrawerParamList,
} from './route-names';
import TabNavigator from './tab-navigator.react';

const communityDrawerContent = () => <CommunityDrawerContent />;

export type CommunityDrawerNavigationProp<
  RouteName: $Keys<CommunityDrawerParamList> = $Keys<CommunityDrawerParamList>,
> = DrawerNavigationProp<ScreenParamList, RouteName>;

const Drawer = createDrawerNavigator<
  ScreenParamList,
  CommunityDrawerParamList,
  DrawerNavigationHelpers<ScreenParamList>,
>();

type Props = {
  +navigation: AppNavigationProp<'CommunityDrawerNavigator'>,
  +route: NavigationRoute<'CommunityDrawerNavigator'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityDrawerNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const navContext = React.useContext(NavContext);
  const swipeEnabled = React.useMemo(
    () => drawerSwipeEnabledSelector(navContext),
    [navContext],
  );

  const screenOptions = React.useMemo(
    () => ({
      drawerStyle: styles.drawerStyle,
      headerShown: false,
      swipeEnabled,
    }),
    [styles.drawerStyle, swipeEnabled],
  );

  return (
    <View style={styles.drawerView}>
      <Drawer.Navigator
        screenOptions={screenOptions}
        drawerContent={communityDrawerContent}
      >
        <Drawer.Screen name={TabNavigatorRouteName} component={TabNavigator} />
      </Drawer.Navigator>
    </View>
  );
}

const unboundStyles = {
  drawerView: {
    flex: 1,
  },
  drawerStyle: {
    width: '80%',
  },
};

export { CommunityDrawerNavigator };
