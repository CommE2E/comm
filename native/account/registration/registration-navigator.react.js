// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
} from '@react-navigation/stack';
import * as React from 'react';

import ConnectEthereum from './connect-ethereum.react.js';
import CoolOrNerdModeSelection from './cool-or-nerd-mode-selection.react.js';
import KeyserverSelection from './keyserver-selection.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  KeyserverSelectionRouteName,
  CoolOrNerdModeSelectionRouteName,
  ConnectEthereumRouteName,
  type ScreenParamList,
  type RegistrationParamList,
} from '../../navigation/route-names.js';

export type RegistrationNavigationProp<
  RouteName: $Keys<RegistrationParamList> = $Keys<RegistrationParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const Registration = createStackNavigator<
  ScreenParamList,
  RegistrationParamList,
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

type Props = {
  +navigation: RootNavigationProp<'Registration'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function RegistrationNavigator(props: Props): React.Node {
  return (
    <Registration.Navigator screenOptions={screenOptions}>
      <Registration.Screen
        name={CoolOrNerdModeSelectionRouteName}
        component={CoolOrNerdModeSelection}
      />
      <Registration.Screen
        name={KeyserverSelectionRouteName}
        component={KeyserverSelection}
      />
      <Registration.Screen
        name={ConnectEthereumRouteName}
        component={ConnectEthereum}
      />
    </Registration.Navigator>
  );
}

export default RegistrationNavigator;
