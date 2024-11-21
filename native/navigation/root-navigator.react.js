// @flow

import type {
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  StackNavigatorProps,
  ExtraStackNavigatorProps,
  ParamListBase,
  StackNavigationHelpers,
  StackNavigationProp,
  StackRouterOptions,
  RouteProp,
} from '@react-navigation/core';
import {
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { StackView } from '@react-navigation/stack';
import * as React from 'react';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

import AppNavigator from './app-navigator.react.js';
import InviteLinkModal from './invite-link-modal.react.js';
import { defaultStackScreenOptions, transitionPreset } from './options.js';
import { RootNavigatorContext } from './root-navigator-context.js';
import RootRouter, {
  type RootRouterExtraNavigationHelpers,
  type RootRouterNavigationAction,
} from './root-router.js';
import {
  LoggedOutModalRouteName,
  AppRouteName,
  ThreadPickerModalRouteName,
  ImagePasteModalRouteName,
  AddUsersModalRouteName,
  CustomServerModalRouteName,
  ColorSelectorModalRouteName,
  ComposeSubchannelModalRouteName,
  SidebarListModalRouteName,
  SubchannelsListModalRouteName,
  MessageReactionsModalRouteName,
  type ScreenParamList,
  type RootParamList,
  TermsAndPrivacyRouteName,
  RegistrationRouteName,
  InviteLinkModalRouteName,
  InviteLinkNavigatorRouteName,
  CommunityCreationRouteName,
  RolesNavigatorRouteName,
  SignInNavigatorRouteName,
  UserProfileBottomSheetNavigatorRouteName,
  KeyserverSelectionBottomSheetRouteName,
  ConnectFarcasterBottomSheetRouteName,
  DirectoryPromptBottomSheetRouteName,
  TagFarcasterChannelNavigatorRouteName,
  CreateMissingSIWEBackupMessageRouteName,
  RestoreSIWEBackupRouteName,
  LinkedDevicesBottomSheetRouteName,
} from './route-names.js';
import LoggedOutModal from '../account/logged-out-modal.react.js';
import CreateMissingSIWEBackupMessage from '../account/registration/missing-registration-data/missing-siwe-backup-message.react.js';
import RegistrationNavigator from '../account/registration/registration-navigator.react.js';
import SignInNavigator from '../account/sign-in-navigator.react.js';
import TermsAndPrivacyModal from '../account/terms-and-privacy-modal.react.js';
import RestoreSIWEBackup from '../backup/restore-siwe-backup.react.js';
import ThreadPickerModal from '../calendar/thread-picker-modal.react.js';
import ImagePasteModal from '../chat/image-paste-modal.react.js';
import MessageReactionsModal from '../chat/message-reactions-modal.react.js';
import AddUsersModal from '../chat/settings/add-users-modal.react.js';
import ColorSelectorModal from '../chat/settings/color-selector-modal.react.js';
import ComposeSubchannelModal from '../chat/settings/compose-subchannel-modal.react.js';
import SidebarListModal from '../chat/sidebar-list-modal.react.js';
import SubchannelsListModal from '../chat/subchannels-list-modal.react.js';
import CommunityCreationNavigator from '../community-creation/community-creation-navigator.react.js';
import TagFarcasterChannelNavigator from '../community-settings/tag-farcaster-channel/tag-farcaster-channel-navigator.react.js';
import ConnectFarcasterBottomSheet from '../components/connect-farcaster-bottom-sheet.react.js';
import DirectoryPromptBottomSheet from '../components/directory-prompt-bottom-sheet.react.js';
import InviteLinksNavigator from '../invite-links/invite-links-navigator.react.js';
import CustomServerModal from '../profile/custom-server-modal.react.js';
import KeyserverSelectionBottomSheet from '../profile/keyserver-selection-bottom-sheet.react.js';
import LinkedDevicesBottomSheet from '../profile/linked-devices-bottom-sheet.react.js';
import RolesNavigator from '../roles/roles-navigator.react.js';
import UserProfileBottomSheetNavigator from '../user-profile/user-profile-bottom-sheet-navigator.react.js';

enableScreens();

export type RootNavigationHelpers<ParamList: ParamListBase = ParamListBase> = {
  ...$Exact<StackNavigationHelpers<ParamList>>,
  ...RootRouterExtraNavigationHelpers,
  ...
};

type RootNavigatorProps = StackNavigatorProps<RootNavigationHelpers<>>;
function RootNavigator({
  initialRouteName,
  children,
  screenOptions,
  defaultScreenOptions,
  screenListeners,
  id,
  ...rest
}: RootNavigatorProps) {
  const [keyboardHandlingEnabled, setKeyboardHandlingEnabled] =
    React.useState(true);
  const mergedScreenOptions = React.useMemo(() => {
    if (typeof screenOptions === 'function') {
      return (input: {
        +route: RouteProp<>,
        +navigation: RootNavigationHelpers<>,
      }) => ({
        ...screenOptions(input),
        keyboardHandlingEnabled,
      });
    }
    return {
      ...screenOptions,
      keyboardHandlingEnabled,
    };
  }, [screenOptions, keyboardHandlingEnabled]);

  const { state, descriptors, navigation } = useNavigationBuilder<
    StackNavigationState,
    RootRouterNavigationAction,
    StackOptions,
    StackRouterOptions,
    RootNavigationHelpers<>,
    StackNavigationEventMap,
    ExtraStackNavigatorProps,
  >(RootRouter, {
    id,
    initialRouteName,
    children,
    screenOptions: mergedScreenOptions,
    defaultScreenOptions,
    screenListeners,
  });

  const rootNavigationContext = React.useMemo(
    () => ({ setKeyboardHandlingEnabled }),
    [setKeyboardHandlingEnabled],
  );

  return (
    <RootNavigatorContext.Provider value={rootNavigationContext}>
      <StackView
        {...rest}
        state={state}
        descriptors={descriptors}
        navigation={navigation}
        detachInactiveScreens={Platform.OS !== 'ios'}
      />
    </RootNavigatorContext.Provider>
  );
}
const createRootNavigator = createNavigatorFactory<
  StackNavigationState,
  StackOptions,
  StackNavigationEventMap,
  RootNavigationHelpers<>,
  ExtraStackNavigatorProps,
>(RootNavigator);

const defaultScreenOptions = {
  ...defaultStackScreenOptions,
  ...transitionPreset,
  cardStyle: { backgroundColor: 'transparent' },
  presentation: 'modal',
  headerShown: false,
};
const disableGesturesScreenOptions = {
  gestureEnabled: false,
};
const modalOverlayScreenOptions = {
  cardOverlayEnabled: true,
  presentation: 'transparentModal',
};
const termsAndPrivacyModalScreenOptions = {
  gestureEnabled: false,
  cardOverlayEnabled: true,
  presentation: 'transparentModal',
};

export type RootRouterNavigationProp<
  ParamList: ParamListBase = ParamListBase,
  RouteName: $Keys<ParamList> = $Keys<ParamList>,
> = {
  ...StackNavigationProp<ParamList, RouteName>,
  ...RootRouterExtraNavigationHelpers,
};

export type RootNavigationProp<
  RouteName: $Keys<ScreenParamList> = $Keys<ScreenParamList>,
> = {
  ...StackNavigationProp<ScreenParamList, RouteName>,
  ...RootRouterExtraNavigationHelpers,
};

const Root = createRootNavigator<
  ScreenParamList,
  RootParamList,
  RootNavigationHelpers<ScreenParamList>,
>();
function RootComponent(): React.Node {
  return (
    <Root.Navigator screenOptions={defaultScreenOptions}>
      <Root.Screen
        name={LoggedOutModalRouteName}
        component={LoggedOutModal}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen
        name={RegistrationRouteName}
        component={RegistrationNavigator}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen
        name={SignInNavigatorRouteName}
        component={SignInNavigator}
        options={disableGesturesScreenOptions}
      />
      <Root.Screen
        name={CommunityCreationRouteName}
        component={CommunityCreationNavigator}
      />
      <Root.Screen name={AppRouteName} component={AppNavigator} />
      <Root.Screen
        name={TermsAndPrivacyRouteName}
        component={TermsAndPrivacyModal}
        options={termsAndPrivacyModalScreenOptions}
      />
      <Root.Screen
        name={InviteLinkModalRouteName}
        component={InviteLinkModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={InviteLinkNavigatorRouteName}
        component={InviteLinksNavigator}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ThreadPickerModalRouteName}
        component={ThreadPickerModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ImagePasteModalRouteName}
        component={ImagePasteModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={AddUsersModalRouteName}
        component={AddUsersModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={CustomServerModalRouteName}
        component={CustomServerModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ColorSelectorModalRouteName}
        component={ColorSelectorModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ComposeSubchannelModalRouteName}
        component={ComposeSubchannelModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={SidebarListModalRouteName}
        component={SidebarListModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={SubchannelsListModalRouteName}
        component={SubchannelsListModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={MessageReactionsModalRouteName}
        component={MessageReactionsModal}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen name={RolesNavigatorRouteName} component={RolesNavigator} />
      <Root.Screen
        name={UserProfileBottomSheetNavigatorRouteName}
        component={UserProfileBottomSheetNavigator}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={KeyserverSelectionBottomSheetRouteName}
        component={KeyserverSelectionBottomSheet}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={LinkedDevicesBottomSheetRouteName}
        component={LinkedDevicesBottomSheet}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={ConnectFarcasterBottomSheetRouteName}
        component={ConnectFarcasterBottomSheet}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={DirectoryPromptBottomSheetRouteName}
        component={DirectoryPromptBottomSheet}
        options={modalOverlayScreenOptions}
      />
      <Root.Screen
        name={TagFarcasterChannelNavigatorRouteName}
        component={TagFarcasterChannelNavigator}
      />
      <Root.Screen
        name={CreateMissingSIWEBackupMessageRouteName}
        component={CreateMissingSIWEBackupMessage}
      />
      <Root.Screen
        name={RestoreSIWEBackupRouteName}
        component={RestoreSIWEBackup}
      />
    </Root.Navigator>
  );
}
export default RootComponent;
