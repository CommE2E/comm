// @flow

import type {
  StackNavigationProp,
  StackNavigationHelpers,
  StackHeaderProps,
  StackHeaderLeftButtonProps,
} from '@react-navigation/core';
import { createStackNavigator } from '@react-navigation/stack';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';

import AddKeyserver from './add-keyserver.react.js';
import AppearancePreferences from './appearance-preferences.react.js';
import BackupMenu from './backup-menu.react.js';
import BuildInfo from './build-info.react.js';
import DebugLogsScreen from './debug-logs-screen.react.js';
import DefaultNotificationsPreferences from './default-notifications-preferences.react.js';
import DeleteAccount from './delete-account.react.js';
import DevTools from './dev-tools.react.js';
import EditPassword from './edit-password.react.js';
import EmojiUserAvatarCreation from './emoji-user-avatar-creation.react.js';
import FarcasterAccountSettings from './farcaster-account-settings.react.js';
import KeyserverSelectionListHeaderRightButton from './keyserver-selection-list-header-right-button.react.js';
import KeyserverSelectionList from './keyserver-selection-list.react.js';
import LinkedDevicesHeaderRightButton from './linked-devices-header-right-button.react.js';
import LinkedDevices from './linked-devices.react.js';
import PrivacyPreferences from './privacy-preferences.react.js';
import ProfileHeader from './profile-header.react.js';
import ProfileScreen from './profile-screen.react.js';
import RelationshipList from './relationship-list.react.js';
import TunnelbrokerMenu from './tunnelbroker-menu.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import CommunityDrawerButton from '../navigation/community-drawer-button.react.js';
import HeaderBackButton from '../navigation/header-back-button.react.js';
import {
  ProfileScreenRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  EmojiUserAvatarCreationRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  PrivacyPreferencesRouteName,
  FriendListRouteName,
  DefaultNotificationsPreferencesRouteName,
  BlockListRouteName,
  LinkedDevicesRouteName,
  BackupMenuRouteName,
  KeyserverSelectionListRouteName,
  AddKeyserverRouteName,
  FarcasterAccountSettingsRouteName,
  type ScreenParamList,
  type ProfileParamList,
  TunnelbrokerMenuRouteName,
  DebugLogsScreenRouteName,
} from '../navigation/route-names.js';
import type { TabNavigationProp } from '../navigation/tab-navigator.react.js';
import { useStyles, useColors } from '../themes/colors.js';

const header = (props: StackHeaderProps) => <ProfileHeader {...props} />;
const profileScreenOptions = { headerTitle: 'Profile' };
const emojiAvatarCreationOptions = {
  headerTitle: 'Emoji avatar selection',
  headerBackTitleVisible: false,
};
const editPasswordOptions = { headerTitle: 'Change password' };
const deleteAccountOptions = { headerTitle: 'Delete account' };
const linkedDevicesOptions = {
  headerTitle: 'Linked devices',
  headerRight: () => <LinkedDevicesHeaderRightButton />,
};
const keyserverSelectionListOptions = {
  headerTitle: 'Keyservers',
  headerRight: () => <KeyserverSelectionListHeaderRightButton />,
};
const addKeyserverOptions = { headerTitle: 'Add keyserver' };
const backupMenuOptions = { headerTitle: 'Backup menu' };
const tunnelbrokerMenuOptions = { headerTitle: 'Tunnelbroker menu' };
const buildInfoOptions = { headerTitle: 'Build info' };
const devToolsOptions = { headerTitle: 'Developer tools' };
const appearanceOptions = { headerTitle: 'Appearance' };
const privacyOptions = { headerTitle: 'Privacy' };
const friendListOptions = { headerTitle: 'Friend list' };
const blockListOptions = { headerTitle: 'Block list' };
const defaultNotificationsOptions = { headerTitle: 'Default Notifications' };
const farcasterSettingsOptions = { headerTitle: 'Farcaster account' };
const debugLogsScreenOptions = { headerTitle: 'Logs' };

export type ProfileNavigationProp<
  RouteName: $Keys<ProfileParamList> = $Keys<ProfileParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const Profile = createStackNavigator<
  ScreenParamList,
  ProfileParamList,
  StackNavigationHelpers<ScreenParamList>,
>();
type Props = {
  +navigation: TabNavigationProp<'Profile'>,
  ...
};

function ProfileComponent(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const headerLeftButton = React.useCallback(
    (headerProps: StackHeaderLeftButtonProps) =>
      headerProps.canGoBack ? (
        <HeaderBackButton {...headerProps} />
      ) : (
        <CommunityDrawerButton navigation={props.navigation} />
      ),
    [props.navigation],
  );

  const { width: screenWidth } = useWindowDimensions();
  const screenOptions = React.useMemo(
    () => ({
      header,
      headerLeft: headerLeftButton,
      headerStyle: {
        backgroundColor: colors.tabBarBackground,
        shadowOpacity: 0,
      },
      gestureEnabled: true,
      gestureResponseDistance: screenWidth,
    }),
    [colors.tabBarBackground, headerLeftButton, screenWidth],
  );

  return (
    <View style={styles.view}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardAvoidingView}
      >
        <Profile.Navigator
          screenOptions={screenOptions}
          detachInactiveScreens={false}
        >
          <Profile.Screen
            name={ProfileScreenRouteName}
            component={ProfileScreen}
            options={profileScreenOptions}
          />
          <Profile.Screen
            name={EmojiUserAvatarCreationRouteName}
            component={EmojiUserAvatarCreation}
            options={emojiAvatarCreationOptions}
          />
          <Profile.Screen
            name={EditPasswordRouteName}
            component={EditPassword}
            options={editPasswordOptions}
          />
          <Profile.Screen
            name={DeleteAccountRouteName}
            component={DeleteAccount}
            options={deleteAccountOptions}
          />
          <Profile.Screen
            name={LinkedDevicesRouteName}
            component={LinkedDevices}
            options={linkedDevicesOptions}
          />
          <Profile.Screen
            name={KeyserverSelectionListRouteName}
            component={KeyserverSelectionList}
            options={keyserverSelectionListOptions}
          />
          <Profile.Screen
            name={AddKeyserverRouteName}
            component={AddKeyserver}
            options={addKeyserverOptions}
          />
          <Profile.Screen
            name={BackupMenuRouteName}
            component={BackupMenu}
            options={backupMenuOptions}
          />
          <Profile.Screen
            name={TunnelbrokerMenuRouteName}
            component={TunnelbrokerMenu}
            options={tunnelbrokerMenuOptions}
          />
          <Profile.Screen
            name={BuildInfoRouteName}
            component={BuildInfo}
            options={buildInfoOptions}
          />
          <Profile.Screen
            name={DevToolsRouteName}
            component={DevTools}
            options={devToolsOptions}
          />
          <Profile.Screen
            name={AppearancePreferencesRouteName}
            component={AppearancePreferences}
            options={appearanceOptions}
          />
          <Profile.Screen
            name={PrivacyPreferencesRouteName}
            component={PrivacyPreferences}
            options={privacyOptions}
          />
          <Profile.Screen
            name={DefaultNotificationsPreferencesRouteName}
            component={DefaultNotificationsPreferences}
            options={defaultNotificationsOptions}
          />
          <Profile.Screen
            name={FriendListRouteName}
            component={RelationshipList}
            options={friendListOptions}
          />
          <Profile.Screen
            name={BlockListRouteName}
            component={RelationshipList}
            options={blockListOptions}
          />
          <Profile.Screen
            name={FarcasterAccountSettingsRouteName}
            component={FarcasterAccountSettings}
            options={farcasterSettingsOptions}
          />
          <Profile.Screen
            name={DebugLogsScreenRouteName}
            component={DebugLogsScreen}
            options={debugLogsScreenOptions}
          />
        </Profile.Navigator>
      </KeyboardAvoidingView>
    </View>
  );
}

const unboundStyles = {
  keyboardAvoidingView: {
    flex: 1,
  },
  view: {
    flex: 1,
    backgroundColor: 'panelBackground',
  },
};

export default ProfileComponent;
