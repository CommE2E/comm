// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import QRCodeScreen from './qr-code-screen.react.js';
import RestorePasswordAccountScreen from './restore-password-account-screen.react.js';
import RestorePromptScreen from './restore-prompt-screen.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type ScreenParamList,
  type SignInParamList,
  QRCodeScreenRouteName,
  RestorePromptScreenRouteName,
  RestorePasswordAccountScreenRouteName,
} from '../navigation/route-names.js';
import { useStyles, useColors } from '../themes/colors.js';

const safeAreaEdges = ['bottom'];

export type SignInNavigationProp<RouteName: $Keys<SignInParamList>> =
  StackNavigationProp<ScreenParamList, RouteName>;

const SignInStack = createStackNavigator<
  ScreenParamList,
  SignInParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

type SignInNavigatorProps = {
  +navigation: RootNavigationProp<'SignInNavigator'>,
  ...
};

// eslint-disable-next-line no-unused-vars
function SignInNavigator(props: SignInNavigatorProps): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const screenOptions = React.useMemo(
    () => ({
      headerTransparent: true,
      headerBackTitleVisible: false,
      headerTitle: '',
      headerTintColor: colors.panelForegroundLabel,
      headerLeftContainerStyle: {
        paddingLeft: 12,
      },
    }),
    [colors.panelForegroundLabel],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
      <SignInStack.Navigator screenOptions={screenOptions}>
        <SignInStack.Screen
          name={QRCodeScreenRouteName}
          component={QRCodeScreen}
        />
        <SignInStack.Screen
          name={RestorePromptScreenRouteName}
          component={RestorePromptScreen}
        />
        <SignInStack.Screen
          name={RestorePasswordAccountScreenRouteName}
          component={RestorePasswordAccountScreen}
        />
      </SignInStack.Navigator>
    </SafeAreaView>
  );
}

const unboundStyles = {
  safeArea: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
  headerLeftStyle: {
    paddingLeft: 12,
  },
};

export default SignInNavigator;
