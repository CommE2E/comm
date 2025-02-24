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
import AuthRouter, {
  type AuthRouterExtraNavigationHelpers,
  type AuthRouterNavigationAction,
} from './auth-router.js';
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
  type AuthParamList,
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

type AuthNavigationHelpers<ParamList: ParamListBase = ParamListBase> = {
  ...$Exact<StackNavigationHelpers<ParamList>>,
  ...AuthRouterExtraNavigationHelpers,
};

type AuthNavigatorProps = StackNavigatorProps<AuthNavigationHelpers<>>;
function AuthNavigator({
  initialRouteName,
  children,
  screenOptions,
  defaultScreenOptions,
  screenListeners,
  id,
  ...rest
}: AuthNavigatorProps) {
  const { state, descriptors, navigation } = useNavigationBuilder<
    StackNavigationState,
    AuthRouterNavigationAction,
    StackOptions,
    StackRouterOptions,
    AuthNavigationHelpers<>,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
  >(AuthRouter, {
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
const createAuthNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  AuthNavigationHelpers<>,
  ExtraStackNavigatorProps,
>(AuthNavigator);

export type AuthNavigationProp<
  RouteName: $Keys<AuthParamList> = $Keys<AuthParamList>,
> = {
  ...StackNavigationProp<ScreenParamList, RouteName>,
  ...AuthRouterExtraNavigationHelpers,
};

const Auth = createAuthNavigator<
  ScreenParamList,
  AuthParamList,
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

const disableGesturesScreenOptions = {
  headerLeft: null,
  gestureEnabled: false,
};

const cameraScreenOptions = {
  headerShown: false,
};

type Props = {
  +navigation: RootNavigationProp<'Auth'>,
  ...
};
// eslint-disable-next-line no-unused-vars
function AuthComponent(props: Props): React.Node {
  return (
    <Auth.Navigator
      screenOptions={screenOptions}
      initialRouteName={ConnectFarcasterRouteName}
    >
      <Auth.Screen
        name={CoolOrNerdModeSelectionRouteName}
        component={CoolOrNerdModeSelection}
      />
      <Auth.Screen
        name={KeyserverSelectionRouteName}
        component={KeyserverSelection}
      />
      <Auth.Screen
        name={ConnectEthereumRouteName}
        component={ConnectEthereum}
      />
      <Auth.Screen
        name={ExistingEthereumAccountRouteName}
        component={ExistingEthereumAccount}
      />
      <Auth.Screen
        name={ConnectFarcasterRouteName}
        component={ConnectFarcaster}
      />
      <Auth.Screen
        name={CreateSIWEBackupMessageRouteName}
        component={CreateSIWEBackupMessage}
      />
      <Auth.Screen
        name={UsernameSelectionRouteName}
        component={UsernameSelection}
      />
      <Auth.Screen
        name={PasswordSelectionRouteName}
        component={PasswordSelection}
      />
      <Auth.Screen
        name={AvatarSelectionRouteName}
        component={AvatarSelection}
      />
      <Auth.Screen
        name={EmojiAvatarSelectionRouteName}
        component={EmojiAvatarSelection}
      />
      <Auth.Screen
        name={RegistrationUserAvatarCameraModalRouteName}
        component={RegistrationUserAvatarCameraModal}
        options={cameraScreenOptions}
      />
      <Auth.Screen
        name={RegistrationTermsRouteName}
        component={RegistrationTerms}
      />
      <Auth.Screen
        name={AccountDoesNotExistRouteName}
        component={AccountDoesNotExist}
      />
      <Auth.Screen name={QRCodeScreenRouteName} component={QRCodeScreen} />
      <Auth.Screen
        name={RestorePromptScreenRouteName}
        component={RestorePromptScreen}
      />
      <Auth.Screen
        name={RestorePasswordAccountScreenRouteName}
        component={RestorePasswordAccountScreen}
      />
      <Auth.Screen
        name={RestoreBackupScreenRouteName}
        component={RestoreBackupScreen}
        options={disableGesturesScreenOptions}
      />
      <Auth.Screen
        name={RestoreSIWEBackupRouteName}
        component={RestoreSIWEBackup}
      />
    </Auth.Navigator>
  );
}

export default AuthComponent;
