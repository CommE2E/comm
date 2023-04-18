// @flow

import * as React from 'react';
import { View, Text, Alert, Platform, ScrollView } from 'react-native';

import { logOutActionTypes, logOut } from 'lib/actions/user-actions.js';
import { useStringForUser } from 'lib/hooks/ens-cache.js';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { accountHasPassword } from 'lib/shared/account-utils.js';
import type { LogOutResult } from 'lib/types/account-types.js';
import { type PreRequestUserState } from 'lib/types/session-types.js';
import { type CurrentUserInfo } from 'lib/types/user-types.js';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import { deleteNativeCredentialsFor } from '../account/native-credentials.js';
import EditAvatar from '../avatars/edit-avatar.react.js';
import UserAvatar from '../avatars/user-avatar.react.js';
import Action from '../components/action-row.react.js';
import Button from '../components/button.react.js';
import EditSettingButton from '../components/edit-setting-button.react.js';
import { SingleLine } from '../components/single-line.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import {
  EditPasswordRouteName,
  EmojiAvatarCreationRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  BlockListRouteName,
  PrivacyPreferencesRouteName,
  DefaultNotificationsPreferencesRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

type ProfileRowProps = {
  +content: string,
  +onPress: () => void,
  +danger?: boolean,
};

function ProfileRow(props: ProfileRowProps): React.Node {
  const { content, onPress, danger } = props;
  return (
    <Action.Row onPress={onPress}>
      <Action.Text danger={danger} content={content} />
      <Action.Icon name="ios-arrow-forward" />
    </Action.Row>
  );
}

type BaseProps = {
  +navigation: ProfileNavigationProp<'ProfileScreen'>,
  +route: NavigationRoute<'ProfileScreen'>,
};
type Props = {
  ...BaseProps,
  +currentUserInfo: ?CurrentUserInfo,
  +preRequestUserState: PreRequestUserState,
  +logOutLoading: boolean,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +dispatchActionPromise: DispatchActionPromise,
  +logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
  +staffCanSee: boolean,
  +stringForUser: ?string,
  +isAccountWithPassword: boolean,
  +shouldRenderAvatars: boolean,
};

class ProfileScreen extends React.PureComponent<Props> {
  get loggedOutOrLoggingOut() {
    return (
      !this.props.currentUserInfo ||
      this.props.currentUserInfo.anonymous ||
      this.props.logOutLoading
    );
  }

  render() {
    let developerTools, defaultNotifications;
    const { staffCanSee } = this.props;
    if (staffCanSee) {
      developerTools = (
        <ProfileRow content="Developer tools" onPress={this.onPressDevTools} />
      );

      defaultNotifications = (
        <ProfileRow
          content="Default Notifications"
          onPress={this.onPressDefaultNotifications}
        />
      );
    }

    let passwordEditionUI;
    if (accountHasPassword(this.props.currentUserInfo)) {
      passwordEditionUI = (
        <Action.Row>
          <Text style={this.props.styles.label}>Password</Text>
          <Text
            style={[this.props.styles.content, this.props.styles.value]}
            numberOfLines={1}
          >
            ••••••••••••••••
          </Text>
          <EditSettingButton
            onPress={this.onPressEditPassword}
            canChangeSettings={true}
            style={this.props.styles.editPasswordButton}
          />
        </Action.Row>
      );
    }

    let avatarSection;
    if (this.props.shouldRenderAvatars) {
      avatarSection = (
        <>
          <Text style={this.props.styles.header}>USER AVATAR</Text>
          <View
            style={[this.props.styles.section, this.props.styles.avatarSection]}
          >
            <EditAvatar onPressEmojiAvatarFlow={this.onPressEmojiAvatarFlow}>
              <UserAvatar
                size="profile"
                userID={this.props.currentUserInfo?.id}
              />
            </EditAvatar>
          </View>
        </>
      );
    }

    return (
      <View style={this.props.styles.container}>
        <ScrollView
          contentContainerStyle={this.props.styles.scrollViewContentContainer}
          style={this.props.styles.scrollView}
        >
          {avatarSection}
          <Text style={this.props.styles.header}>ACCOUNT</Text>
          <View style={this.props.styles.section}>
            <Action.Row>
              <Text style={this.props.styles.loggedInLabel}>Logged in as </Text>
              <SingleLine
                style={[this.props.styles.label, this.props.styles.username]}
              >
                {this.props.stringForUser}
              </SingleLine>
              <Button
                onPress={this.onPressLogOut}
                disabled={this.loggedOutOrLoggingOut}
              >
                <Text style={this.props.styles.logOutText}>Log out</Text>
              </Button>
            </Action.Row>
            {passwordEditionUI}
          </View>
          <View style={this.props.styles.section}>
            <ProfileRow
              content="Friend list"
              onPress={this.onPressFriendList}
            />
            <ProfileRow content="Block list" onPress={this.onPressBlockList} />
          </View>
          <Text style={this.props.styles.header}>PREFERENCES</Text>
          <View style={this.props.styles.section}>
            <ProfileRow content="Appearance" onPress={this.onPressAppearance} />
            <ProfileRow content="Privacy" onPress={this.onPressPrivacy} />
            {defaultNotifications}
          </View>
          <View style={this.props.styles.section}>
            <ProfileRow content="Build info" onPress={this.onPressBuildInfo} />
            {developerTools}
          </View>
          <View style={this.props.styles.unpaddedSection}>
            <ProfileRow
              content="Delete account..."
              danger
              onPress={this.onPressDeleteAccount}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  onPressEmojiAvatarFlow = () => {
    this.props.navigation.navigate<'EmojiAvatarCreation'>({
      name: EmojiAvatarCreationRouteName,
      params: {},
    });
  };

  onPressLogOut = () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    if (!this.props.isAccountWithPassword) {
      Alert.alert(
        'Log out',
        'Are you sure you want to log out?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: this.logOutWithoutDeletingNativeCredentialsWrapper,
            style: 'destructive',
          },
        ],
        { cancelable: true },
      );
      return;
    }
    const alertTitle =
      Platform.OS === 'ios' ? 'Keep Login Info in Keychain' : 'Keep Login Info';
    const alertDescription =
      'We will automatically fill out log-in forms with your credentials ' +
      'in the app.';
    Alert.alert(
      alertTitle,
      alertDescription,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep',
          onPress: this.logOutWithoutDeletingNativeCredentialsWrapper,
        },
        {
          text: 'Remove',
          onPress: this.logOutAndDeleteNativeCredentialsWrapper,
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  };

  logOutWithoutDeletingNativeCredentialsWrapper = () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    this.logOut();
  };

  logOutAndDeleteNativeCredentialsWrapper = async () => {
    if (this.loggedOutOrLoggingOut) {
      return;
    }
    await this.deleteNativeCredentials();
    this.logOut();
  };

  logOut() {
    this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOut(this.props.preRequestUserState),
    );
  }

  async deleteNativeCredentials() {
    await deleteNativeCredentialsFor();
  }

  navigateIfActive(name) {
    this.props.navigation.navigate({ name });
  }

  onPressEditPassword = () => {
    this.navigateIfActive(EditPasswordRouteName);
  };

  onPressDeleteAccount = () => {
    this.navigateIfActive(DeleteAccountRouteName);
  };

  onPressBuildInfo = () => {
    this.navigateIfActive(BuildInfoRouteName);
  };

  onPressDevTools = () => {
    this.navigateIfActive(DevToolsRouteName);
  };

  onPressAppearance = () => {
    this.navigateIfActive(AppearancePreferencesRouteName);
  };

  onPressPrivacy = () => {
    this.navigateIfActive(PrivacyPreferencesRouteName);
  };

  onPressDefaultNotifications = () => {
    this.navigateIfActive(DefaultNotificationsPreferencesRouteName);
  };

  onPressFriendList = () => {
    this.navigateIfActive(FriendListRouteName);
  };

  onPressBlockList = () => {
    this.navigateIfActive(BlockListRouteName);
  };
}

const unboundStyles = {
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  deleteAccountButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  editPasswordButton: {
    paddingTop: Platform.OS === 'android' ? 3 : 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingRight: 12,
  },
  loggedInLabel: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
  },
  logOutText: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  paddedRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 1,
  },
  unpaddedSection: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
  },
  username: {
    color: 'panelForegroundLabel',
    flex: 1,
  },
  value: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    textAlign: 'right',
  },
};

const logOutLoadingStatusSelector =
  createLoadingStatusSelector(logOutActionTypes);

const ConnectedProfileScreen: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedProfileScreen(props: BaseProps) {
    const currentUserInfo = useSelector(state => state.currentUserInfo);
    const preRequestUserState = useSelector(preRequestUserStateSelector);
    const logOutLoading =
      useSelector(logOutLoadingStatusSelector) === 'loading';
    const colors = useColors();
    const styles = useStyles(unboundStyles);
    const callLogOut = useServerCall(logOut);
    const dispatchActionPromise = useDispatchActionPromise();
    const staffCanSee = useStaffCanSee();
    const stringForUser = useStringForUser(currentUserInfo);
    const isAccountWithPassword = useSelector(state =>
      accountHasPassword(state.currentUserInfo),
    );
    const shouldRenderAvatars = useShouldRenderAvatars();

    return (
      <ProfileScreen
        {...props}
        currentUserInfo={currentUserInfo}
        preRequestUserState={preRequestUserState}
        logOutLoading={logOutLoading}
        colors={colors}
        styles={styles}
        logOut={callLogOut}
        dispatchActionPromise={dispatchActionPromise}
        staffCanSee={staffCanSee}
        stringForUser={stringForUser}
        isAccountWithPassword={isAccountWithPassword}
        shouldRenderAvatars={shouldRenderAvatars}
      />
    );
  });

export default ConnectedProfileScreen;
