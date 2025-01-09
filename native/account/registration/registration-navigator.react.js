// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
  ParamListBase,
  StackNavigatorProps,
  StackNavigationState,
  StackOptions,
  StackRouterOptions,
  StackNavigationEventMap,
  ExtraStackNavigatorProps,
} from '@react-navigation/core';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackView } from '@react-navigation/stack';
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
import RegistrationRouter, {
  type RegistrationRouterExtraNavigationHelpers,
  type RegistrationRouterNavigationAction,
} from './registration-router.js';
import RegistrationTerms from './registration-terms.react.js';
import { CreateSIWEBackupMessage } from './siwe-backup-message-creation.react.js';
import UsernameSelection from './username-selection.react.js';
import RestoreSIWEBackup from '../../backup/restore-siwe-backup.react.js';
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
  QRCodeScreenRouteName,
  RestorePromptScreenRouteName,
  RestorePasswordAccountScreenRouteName,
  RestoreBackupScreenRouteName,
  RestoreSIWEBackupRouteName,
} from '../../navigation/route-names.js';
import QRCodeScreen from '../qr-code-screen.react.js';
import RestoreBackupScreen from '../restore-backup-screen.react.js';
import RestorePasswordAccountScreen from '../restore-password-account-screen.react.js';
import RestorePromptScreen from '../restore-prompt-screen.react.js';

export type RegistrationNavigationHelpers<
  ParamList: ParamListBase = ParamListBase,
> = {
  ...$Exact<StackNavigationHelpers<ParamList>>,
  ...RegistrationRouterExtraNavigationHelpers,
};

type RegistrationNavigatorProps = StackNavigatorProps<
  RegistrationNavigationHelpers<>,
>;
function RegistrationNavigator({
  initialRouteName,
  children,
  screenOptions,
  defaultScreenOptions,
  screenListeners,
  id,
  ...rest
}: RegistrationNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder<
    StackNavigationState,
    RegistrationRouterNavigationAction,
    StackOptions,
    StackRouterOptions,
    RegistrationNavigationHelpers<>,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
  >(RegistrationRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
    defaultScreenOptions,
    screenListeners,
  });
  return (
    <StackView
      {...rest}
      state={state}
      descriptors={descriptors}
      navigation={navigation}
    />
  );
}
const createRegistrationNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  RegistrationNavigationHelpers<>,
  ExtraStackNavigatorProps,
>(RegistrationNavigator);

export type RegistrationNavigationProp<
  RouteName: $Keys<RegistrationParamList> = $Keys<RegistrationParamList>,
> = {
  ...StackNavigationProp<ScreenParamList, RouteName>,
  ...RegistrationRouterExtraNavigationHelpers,
};

const Registration = createRegistrationNavigator<
  ScreenParamList,
  RegistrationParamList,
  StackNavigationHelpers<ScreenParamList>,
>();

const screenOptions = {
  headerShown: true,
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
function RegistrationComponent(props: Props): React.Node {
  return (
    <Registration.Navigator
      screenOptions={screenOptions}
      initialRouteName={ConnectFarcasterRouteName}
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
      <Registration.Screen
        name={QRCodeScreenRouteName}
        component={QRCodeScreen}
      />
      <Registration.Screen
        name={RestorePromptScreenRouteName}
        component={RestorePromptScreen}
      />
      <Registration.Screen
        name={RestorePasswordAccountScreenRouteName}
        component={RestorePasswordAccountScreen}
      />
      <Registration.Screen
        name={RestoreBackupScreenRouteName}
        component={RestoreBackupScreen}
      />
      <Registration.Screen
        name={RestoreSIWEBackupRouteName}
        component={RestoreSIWEBackup}
      />
    </Registration.Navigator>
  );
}

export default RegistrationComponent;
