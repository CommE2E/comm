// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';

import AccountDoesNotExist from './account-does-not-exist.react.js';
import AvatarSelection from './avatar-selection.react.js';
import ConnectEthereum from './connect-ethereum.react.js';
import ConnectFarcaster from './connect-farcaster.react.js';
import CoolOrNerdModeSelection from './cool-or-nerd-mode-selection.react.js';
import EmojiAvatarSelection from './emoji-avatar-selection.react.js';
import ExistingEthereumAccount from './existing-ethereum-account.react.js';
import KeyserverSelection from './keyserver-selection.react.js';
import PasswordSelection from './password-selection.react.js';
import RegistrationTerms from './registration-terms.react.js';
import { CreateSIWEBackupMessage } from './siwe-backup-message-creation.react.js';
import UsernameSelection from './username-selection.react.js';
import RegistrationUserAvatarCameraModal from '../../media/registration-user-avatar-camera-modal.react.js';
import type { RootNavigationProp } from '../../navigation/root-navigator.react.js';
import {
  KeyserverSelectionRouteName,
  CoolOrNerdModeSelectionRouteName,
  ConnectEthereumRouteName,
  CreateSIWEBackupMessageRouteName,
  ExistingEthereumAccountRouteName,
  UsernameSelectionRouteName,
  ConnectFarcasterRouteName,
  PasswordSelectionRouteName,
  AvatarSelectionRouteName,
  EmojiAvatarSelectionRouteName,
  RegistrationUserAvatarCameraModalRouteName,
  RegistrationTermsRouteName,
  AccountDoesNotExistRouteName,
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

const cameraScreenOptions = {
  headerShown: false,
};

type Props = {
  +navigation: RootNavigationProp<'Registration'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function RegistrationNavigator(props: Props): React.Node {
  return (
    <Registration.Navigator
      screenOptions={screenOptions}
      initialRouteName={ConnectEthereumRouteName}
    >
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
      <Registration.Screen
        name={ExistingEthereumAccountRouteName}
        component={ExistingEthereumAccount}
      />
      <Registration.Screen
        name={ConnectFarcasterRouteName}
        component={ConnectFarcaster}
      />
      <Registration.Screen
        name={CreateSIWEBackupMessageRouteName}
        component={CreateSIWEBackupMessage}
      />
      <Registration.Screen
        name={UsernameSelectionRouteName}
        component={UsernameSelection}
      />
      <Registration.Screen
        name={PasswordSelectionRouteName}
        component={PasswordSelection}
      />
      <Registration.Screen
        name={AvatarSelectionRouteName}
        component={AvatarSelection}
      />
      <Registration.Screen
        name={EmojiAvatarSelectionRouteName}
        component={EmojiAvatarSelection}
      />
      <Registration.Screen
        name={RegistrationUserAvatarCameraModalRouteName}
        component={RegistrationUserAvatarCameraModal}
        options={cameraScreenOptions}
      />
      <Registration.Screen
        name={RegistrationTermsRouteName}
        component={RegistrationTerms}
      />
      <Registration.Screen
        name={AccountDoesNotExistRouteName}
        component={AccountDoesNotExist}
      />
    </Registration.Navigator>
  );
}

export default RegistrationNavigator;
