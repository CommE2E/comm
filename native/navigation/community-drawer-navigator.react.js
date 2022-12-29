// @flow

import { createDrawerNavigator } from '@react-navigation/drawer';
import * as React from 'react';
import { Dimensions, View } from 'react-native';

import { useStyles } from '../themes/colors';
import type { AppNavigationProp } from './app-navigator.react';
import CommunityDrawerContent from './community-drawer-content.react';
import { TabNavigatorRouteName } from './route-names';
import type { NavigationRoute } from './route-names';
import TabNavigator from './tab-navigator.react';

const Drawer = createDrawerNavigator();

const communityDrawerContent = () => <CommunityDrawerContent />;

type Props = {
  +navigation: AppNavigationProp<'CommunityDrawerNavigator'>,
  +route: NavigationRoute<'CommunityDrawerNavigator'>,
};

// eslint-disable-next-line no-unused-vars
function CommunityDrawerNavigator(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const screenOptions = React.useMemo(
    () => ({
      drawerStyle: styles.drawerStyle,
    }),
    [styles.drawerStyle],
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
    width: Dimensions.get('window').width - 36,
  },
};

export { CommunityDrawerNavigator };
