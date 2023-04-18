// @flow

import {
  createStackNavigator,
  type StackNavigationProp,
  type StackNavigationHelpers,
  type StackHeaderProps,
} from '@react-navigation/stack';
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';

import AppearancePreferences from './appearance-preferences.react.js';
import BuildInfo from './build-info.react.js';
import DefaultNotificationsPreferences from './default-notifications-preferences.react.js';
import DeleteAccount from './delete-account.react.js';
import DevTools from './dev-tools.react.js';
import EditPassword from './edit-password.react.js';
import EmojiUserAvatarCreation from './emoji-user-avatar-creation.react.js';
import PrivacyPreferences from './privacy-preferences.react.js';
import ProfileHeader from './profile-header.react.js';
import ProfileScreen from './profile-screen.react.js';
import RelationshipList from './relationship-list.react.js';
import KeyboardAvoidingView from '../components/keyboard-avoiding-view.react.js';
import CommunityDrawerButton from '../navigation/community-drawer-button.react.js';
import type { CommunityDrawerNavigationProp } from '../navigation/community-drawer-navigator.react.js';
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
  type ScreenParamList,
  type ProfileParamList,
} from '../navigation/route-names.js';
import { useStyles, useColors } from '../themes/colors.js';

const header = (props: StackHeaderProps) => <ProfileHeader {...props} />;
const profileScreenOptions = { headerTitle: 'Profile' };
const emojiAvatarCreationOptions = {
  headerTitle: 'Emoji avatar selection',
  headerBackTitleVisible: false,
};
const editPasswordOptions = { headerTitle: 'Change password' };
const deleteAccountOptions = { headerTitle: 'Delete account' };
const buildInfoOptions = { headerTitle: 'Build info' };
const devToolsOptions = { headerTitle: 'Developer tools' };
const appearanceOptions = { headerTitle: 'Appearance' };
const privacyOptions = { headerTitle: 'Privacy' };
const friendListOptions = { headerTitle: 'Friend list' };
const blockListOptions = { headerTitle: 'Block list' };
const defaultNotificationsOptions = { headerTitle: 'Default Notifications' };

export type ProfileNavigationProp<
  RouteName: $Keys<ProfileParamList> = $Keys<ProfileParamList>,
> = StackNavigationProp<ScreenParamList, RouteName>;

const Profile = createStackNavigator<
  ScreenParamList,
  ProfileParamList,
  StackNavigationHelpers<ScreenParamList>,
>();
type Props = {
  +navigation: CommunityDrawerNavigationProp<'TabNavigator'>,
  ...
};
function ProfileComponent(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const headerLeftButton = React.useCallback(
    headerProps =>
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
