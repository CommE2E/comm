// @flow

import * as React from 'react';
import { View, Text, Alert, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { logOutActionTypes, logOut } from 'lib/actions/user-actions';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { isStaff } from 'lib/shared/user-utils';
import type { LogOutResult } from 'lib/types/account-types';
import { type PreRequestUserState } from 'lib/types/session-types';
import { type CurrentUserInfo } from 'lib/types/user-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { deleteNativeCredentialsFor } from '../account/native-credentials';
import Button from '../components/button.react';
import EditSettingButton from '../components/edit-setting-button.react';
import { SingleLine } from '../components/single-line.react';
import type { NavigationRoute } from '../navigation/route-names';
import {
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  BlockListRouteName,
  PrivacyPreferencesRouteName,
} from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils';
import { type Colors, useColors, useStyles } from '../themes/colors';
import type { ProfileNavigationProp } from './profile.react';

type BaseProps = {|
  +navigation: ProfileNavigationProp<'ProfileScreen'>,
  +route: NavigationRoute<'ProfileScreen'>,
|};
type Props = {|
  ...BaseProps,
  +currentUserInfo: ?CurrentUserInfo,
  +preRequestUserState: PreRequestUserState,
  +logOutLoading: boolean,
  +colors: Colors,
  +styles: typeof unboundStyles,
  +dispatchActionPromise: DispatchActionPromise,
  +logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
|};
class ProfileScreen extends React.PureComponent<Props> {
  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
  }

  get loggedOutOrLoggingOut() {
    return (
      !this.props.currentUserInfo ||
      this.props.currentUserInfo.anonymous ||
      this.props.logOutLoading
    );
  }

  render() {
    const {
      panelIosHighlightUnderlay: underlay,
      navigationChevron,
    } = this.props.colors;

    let appearancePreferences, developerTools;
    if (
      (this.props.currentUserInfo && isStaff(this.props.currentUserInfo.id)) ||
      __DEV__
    ) {
      appearancePreferences = (
        <Button
          onPress={this.onPressAppearance}
          style={this.props.styles.submenuButton}
          iosFormat="highlight"
          iosHighlightUnderlayColor={underlay}
          iosActiveOpacity={0.85}
        >
          <Text style={this.props.styles.submenuText}>Appearance</Text>
          <Icon name="ios-arrow-forward" size={20} color={navigationChevron} />
        </Button>
      );
      developerTools = (
        <Button
          onPress={this.onPressDevTools}
          style={this.props.styles.submenuButton}
          iosFormat="highlight"
          iosHighlightUnderlayColor={underlay}
          iosActiveOpacity={0.85}
        >
          <Text style={this.props.styles.submenuText}>Developer tools</Text>
          <Icon name="ios-arrow-forward" size={20} color={navigationChevron} />
        </Button>
      );
    }

    return (
      <View style={this.props.styles.container}>
        <ScrollView
          contentContainerStyle={this.props.styles.scrollViewContentContainer}
          style={this.props.styles.scrollView}
        >
          <Text style={this.props.styles.header}>ACCOUNT</Text>
          <View style={this.props.styles.section}>
            <View style={this.props.styles.paddedRow}>
              <Text style={this.props.styles.loggedInLabel}>
                {'Logged in as '}
              </Text>
              <SingleLine
                style={[this.props.styles.label, this.props.styles.username]}
              >
                {this.username}
              </SingleLine>
              <Button
                onPress={this.onPressLogOut}
                disabled={this.loggedOutOrLoggingOut}
              >
                <Text style={this.props.styles.logOutText}>Log out</Text>
              </Button>
            </View>
            <View style={this.props.styles.paddedRow}>
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
            </View>
          </View>
          <View style={this.props.styles.section}>
            <Button
              onPress={this.onPressFriendList}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.submenuText}>Friend list</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={navigationChevron}
              />
            </Button>
            <Button
              onPress={this.onPressBlockList}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.submenuText}>Block list</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={navigationChevron}
              />
            </Button>
          </View>

          <Text style={this.props.styles.header}>PREFERENCES</Text>
          <View style={this.props.styles.section}>
            {appearancePreferences}
            <Button
              onPress={this.onPressPrivacy}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.submenuText}>Privacy</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={navigationChevron}
              />
            </Button>
          </View>

          <View style={this.props.styles.section}>
            <Button
              onPress={this.onPressBuildInfo}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.submenuText}>Build info</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={navigationChevron}
              />
            </Button>
            {developerTools}
          </View>
          <View style={this.props.styles.unpaddedSection}>
            <Button
              onPress={this.onPressDeleteAccount}
              style={this.props.styles.deleteAccountButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
              iosActiveOpacity={0.85}
            >
              <Text style={this.props.styles.deleteAccountText}>
                Delete account...
              </Text>
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  onPressLogOut = () => {
    if (this.loggedOutOrLoggingOut) {
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
        { text: 'Keep', onPress: this.logOutButKeepNativeCredentialsWrapper },
        {
          text: 'Remove',
          onPress: this.logOutAndDeleteNativeCredentialsWrapper,
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  };

  logOutButKeepNativeCredentialsWrapper = () => {
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

  onPressFriendList = () => {
    this.navigateIfActive(FriendListRouteName);
  };

  onPressBlockList = () => {
    this.navigateIfActive(BlockListRouteName);
  };
}

const unboundStyles = {
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
  deleteAccountText: {
    color: 'redText',
    flex: 1,
    fontSize: 16,
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
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
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

const logOutLoadingStatusSelector = createLoadingStatusSelector(
  logOutActionTypes,
);

export default React.memo<BaseProps>(function ConnectedProfileScreen(
  props: BaseProps,
) {
  const currentUserInfo = useSelector((state) => state.currentUserInfo);
  const preRequestUserState = useSelector(preRequestUserStateSelector);
  const logOutLoading = useSelector(logOutLoadingStatusSelector) === 'loading';
  const colors = useColors();
  const styles = useStyles(unboundStyles);
  const callLogOut = useServerCall(logOut);
  const dispatchActionPromise = useDispatchActionPromise();

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
    />
  );
});
