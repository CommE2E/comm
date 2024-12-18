// @flow

import type {
  StackHeaderLeftButtonProps,
  StackNavigationHelpers,
  StackNavigationProp,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';

import ConnectSecondaryDevice from './connect-secondary-device.react.js';
import { PrimaryDeviceQRAuthContextProvider } from './primary-device-q-r-auth-context-provider.js';
import QRAuthNotPrimaryDevice from './qr-auth-not-primary-device.react.js';
import SecondaryDeviceConnected from './secondary-device-connected.react.js';
import SecondaryDeviceNotResponding from './secondary-device-not-responding.react.js';
import SecondaryDeviceQRCodeScanner from './secondary-device-qr-code-scanner.react.js';
import HeaderBackButton from '../../navigation/header-back-button.react.js';
import HeaderCloseLeftButton from '../../navigation/header-close-left-button.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  ConnectSecondaryDeviceRouteName,
  type NavigationRoute,
  type QRAuthNavigatorParamList,
  QRAuthNotPrimaryDeviceRouteName,
  type ScreenParamList,
  SecondaryDeviceConnectedRouteName,
  SecondaryDeviceNotRespondingRouteName,
  SecondaryDeviceQRCodeScannerRouteName,
} from '../../navigation/route-names.js';
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
const headerCloseLeftButtonStyle = {
  paddingLeft: 10,
};
const secondaryDeviceQRCodeScannerOptions = {
  headerTitle: deviceIsEmulator ? 'Link device' : '',
  headerBackTitleVisible: false,
  headerLeft: (headerLeftProps: StackHeaderLeftButtonProps) => (
    <HeaderCloseLeftButton
      style={headerCloseLeftButtonStyle}
      onPress={headerLeftProps.onPress}
    />
  ),
};
const disableGesturesScreenOptions = {
  headerLeft: null,
  gestureEnabled: false,
};
const overrideHeaderBackButton = {
  headerLeft: HeaderBackButton,
};

// eslint-disable-next-line no-unused-vars
function QRAuthNavigator(props: Props): React.Node {
  return (
    <PrimaryDeviceQRAuthContextProvider>
      <QRAuthStack.Navigator screenOptions={screenOptions}>
        <QRAuthStack.Screen
          name={SecondaryDeviceQRCodeScannerRouteName}
          component={SecondaryDeviceQRCodeScanner}
          options={secondaryDeviceQRCodeScannerOptions}
        />
        <QRAuthStack.Screen
          name={QRAuthNotPrimaryDeviceRouteName}
          component={QRAuthNotPrimaryDevice}
          options={overrideHeaderBackButton}
        />
        <QRAuthStack.Screen
          name={ConnectSecondaryDeviceRouteName}
          component={ConnectSecondaryDevice}
          options={overrideHeaderBackButton}
        />
        <QRAuthStack.Screen
          name={SecondaryDeviceConnectedRouteName}
          component={SecondaryDeviceConnected}
          options={disableGesturesScreenOptions}
        />
        <QRAuthStack.Screen
          name={SecondaryDeviceNotRespondingRouteName}
          component={SecondaryDeviceNotResponding}
          options={disableGesturesScreenOptions}
        />
      </QRAuthStack.Navigator>
    </PrimaryDeviceQRAuthContextProvider>
  );
}

export default QRAuthNavigator;
