// @flow

import type {
  StackNavigationHelpers,
  StackNavigationProp,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';

import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  type QRAuthNavigatorParamList,
  type ScreenParamList,
  SecondaryDeviceQRCodeScannerRouteName,
} from '../../navigation/route-names.js';
import SecondaryDeviceQRCodeScanner from '../../profile/secondary-device-qr-code-scanner.react.js';
import { deviceIsEmulator } from '../../utils/url-utils.js';

export type QRAuthNavigationProp<RouteName: $Keys<QRAuthNavigatorParamList>> =
  StackNavigationProp<ScreenParamList, RouteName>;

const QRAuthStack = createStackNavigator<
  ScreenParamList,
  QRAuthNavigatorParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

type Props = {
  +navigation: RootNavigationProp<'QRAuthNavigator'>,
  +route: NavigationRoute<'QRAuthNavigator'>,
};

const screenOptions = {
  headerShown: true,
  headerTransparent: true,
  headerBackTitleVisible: false,
  headerTitle: '',
  headerTintColor: 'white',
  headerLeftContainerStyle: {
    paddingLeft: 12,
  },
  gestureEnabled: true,
};
const secondaryDeviceQRCodeScannerOptions = {
  headerTitle: deviceIsEmulator ? 'Link device' : '',
  headerBackTitleVisible: false,
};

// eslint-disable-next-line no-unused-vars
function QRAuthNavigator(props: Props): React.Node {
  return (
    <QRAuthStack.Navigator screenOptions={screenOptions}>
      <QRAuthStack.Screen
        name={SecondaryDeviceQRCodeScannerRouteName}
        component={SecondaryDeviceQRCodeScanner}
        options={secondaryDeviceQRCodeScannerOptions}
      />
    </QRAuthStack.Navigator>
  );
}

export default QRAuthNavigator;
