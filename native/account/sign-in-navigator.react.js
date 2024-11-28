// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';

import QRCodeScreen from './qr-code-screen.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type ScreenParamList,
  type SignInParamList,
  QRCodeScreenRouteName,
} from '../navigation/route-names.js';
import { useColors } from '../themes/colors.js';

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
    <SignInStack.Navigator screenOptions={screenOptions}>
      <SignInStack.Screen
        name={QRCodeScreenRouteName}
        component={QRCodeScreen}
      />
    </SignInStack.Navigator>
  );
}

export default SignInNavigator;
