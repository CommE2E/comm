// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import QRCodeScreen from './qr-code-screen.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type ScreenParamList,
  type QRCodeSignInParamList,
  QRCodeScreenRouteName,
} from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

const safeAreaEdges = ['bottom'];

export type QRCodeSignInNavigationProp<
  RouteName: $Keys<QRCodeSignInParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const QRCodeSignInStack = createStackNavigator<
  ScreenParamList,
  QRCodeSignInParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const screenOptions = {
  headerTransparent: true,
  headerBackTitleVisible: false,
  headerTitle: '',
  headerTintColor: 'white',
  headerLeftContainerStyle: {
    paddingLeft: 12,
  },
};

type QRCodeSignInNavigatorProps = {
  +navigation: RootNavigationProp<'QRCodeSignInNavigator'>,
  ...
};

// eslint-disable-next-line no-unused-vars
function QRCodeSignInNavigator(props: QRCodeSignInNavigatorProps): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
      <QRCodeSignInStack.Navigator screenOptions={screenOptions}>
        <QRCodeSignInStack.Screen
          name={QRCodeScreenRouteName}
          component={QRCodeScreen}
        />
      </QRCodeSignInStack.Navigator>
    </SafeAreaView>
  );
}

const unboundStyles = {
  safeArea: {
    flex: 1,
    backgroundColor: 'modalBackground',
  },
  headerLeftStyle: {
    paddingLeft: 12,
  },
};

export default QRCodeSignInNavigator;
