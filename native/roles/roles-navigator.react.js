// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type ScreenParamList,
  type RolesParamList,
} from '../navigation/route-names.js';
import { useStyles, useColors } from '../themes/colors.js';

const safeAreaEdges = ['bottom'];

export type RolesNavigationProp<RouteName: $Keys<RolesParamList>> =
  StackNavigationProp<ScreenParamList, RouteName>;

const RolesStack = createStackNavigator<
  ScreenParamList,
  RolesParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

type RolesNavigatorProps = {
  +navigation: RootNavigationProp<'RolesNavigator'>,
  ...
};

// eslint-disable-next-line no-unused-vars
function RolesNavigator(props: RolesNavigatorProps): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const rolesScreenOptions = React.useMemo(
    () => ({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
      },
      headerTintColor: colors.panelForegroundLabel,
      headerLeftContainerStyle: {
        paddingLeft: 12,
      },
    }),
    [colors.tabBarBackground, colors.panelForegroundLabel],
  );

  return (
    <SafeAreaView style={styles.container} edges={safeAreaEdges}>
      <RolesStack.Navigator
        screenOptions={rolesScreenOptions}
      ></RolesStack.Navigator>
    </SafeAreaView>
  );
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'modalBackground',
  },
};

export default RolesNavigator;
