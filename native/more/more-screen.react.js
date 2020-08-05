// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux/redux-setup';
import type { LogOutResult } from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import {
  type CurrentUserInfo,
  currentUserPropType,
} from 'lib/types/user-types';
import {
  type PreRequestUserState,
  preRequestUserStatePropType,
} from 'lib/types/session-types';
import type { MoreNavigationProp } from './more.react';

import * as React from 'react';
import {
  View,
  Text,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import { connect } from 'lib/utils/redux-utils';
import {
  logOutActionTypes,
  logOut,
  resendVerificationEmailActionTypes,
  resendVerificationEmail,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';

import {
  getNativeSharedWebCredentials,
  deleteNativeCredentialsFor,
} from '../account/native-credentials';
import Button from '../components/button.react';
import EditSettingButton from '../components/edit-setting-button.react';
import {
  EditEmailRouteName,
  EditPasswordRouteName,
  DeleteAccountRouteName,
  BuildInfoRouteName,
  DevToolsRouteName,
  AppearancePreferencesRouteName,
  FriendListRouteName,
  BlockListRouteName,
} from '../navigation/route-names';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import { firstLine, SingleLine } from '../components/single-line.react';

type Props = {
  navigation: MoreNavigationProp<'MoreScreen'>,
  // Redux state
  currentUserInfo: ?CurrentUserInfo,
  preRequestUserState: PreRequestUserState,
  resendVerificationLoadingStatus: LoadingStatus,
  colors: Colors,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: (preRequestUserState: PreRequestUserState) => Promise<LogOutResult>,
  resendVerificationEmail: () => Promise<void>,
};
class MoreScreen extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    currentUserInfo: currentUserPropType,
    preRequestUserState: preRequestUserStatePropType.isRequired,
    resendVerificationLoadingStatus: loadingStatusPropType.isRequired,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
    resendVerificationEmail: PropTypes.func.isRequired,
  };

  get username() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.username
      : undefined;
  }

  get email() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.email
      : undefined;
  }

  get emailVerified() {
    return this.props.currentUserInfo && !this.props.currentUserInfo.anonymous
      ? this.props.currentUserInfo.emailVerified
      : undefined;
  }

  render() {
    const { emailVerified } = this;
    let emailVerifiedNode = null;
    if (emailVerified === true) {
      emailVerifiedNode = (
        <Text
          style={[
            this.props.styles.verification,
            this.props.styles.verificationText,
            this.props.styles.emailVerified,
          ]}
        >
          Verified
        </Text>
      );
    } else if (emailVerified === false) {
      let resendVerificationEmailSpinner;
      if (this.props.resendVerificationLoadingStatus === 'loading') {
        resendVerificationEmailSpinner = (
          <ActivityIndicator
            size="small"
            style={this.props.styles.resendVerificationEmailSpinner}
          />
        );
      }
      emailVerifiedNode = (
        <View style={this.props.styles.verification}>
          <Text
            style={[
              this.props.styles.verificationText,
              this.props.styles.emailNotVerified,
            ]}
          >
            Not verified
          </Text>
          <Text style={this.props.styles.verificationText}>{' - '}</Text>
          <Button
            onPress={this.onPressResendVerificationEmail}
            style={this.props.styles.resendVerificationEmailButton}
          >
            {resendVerificationEmailSpinner}
            <Text
              style={[
                this.props.styles.verificationText,
                this.props.styles.resendVerificationEmailText,
              ]}
            >
              resend verification email
            </Text>
          </Button>
        </View>
      );
    }

    const {
      panelIosHighlightUnderlay: underlay,
      link: linkColor,
    } = this.props.colors;
    return (
      <View style={this.props.styles.container}>
        <ScrollView
          contentContainerStyle={this.props.styles.scrollViewContentContainer}
          style={this.props.styles.scrollView}
        >
          <View style={this.props.styles.section}>
            <View style={this.props.styles.row}>
              <Text style={this.props.styles.label} numberOfLines={1}>
                {'Logged in as '}
                <Text style={this.props.styles.username}>
                  {firstLine(this.username)}
                </Text>
              </Text>
              <Button onPress={this.onPressLogOut}>
                <Text style={this.props.styles.logOutText}>Log out</Text>
              </Button>
            </View>
          </View>
          <Text style={this.props.styles.header}>ACCOUNT</Text>
          <View style={this.props.styles.section}>
            <View style={this.props.styles.row}>
              <Text style={this.props.styles.label}>Email</Text>
              <View style={this.props.styles.content}>
                <SingleLine style={this.props.styles.value}>
                  {this.email}
                </SingleLine>
                {emailVerifiedNode}
              </View>
              <EditSettingButton
                onPress={this.onPressEditEmail}
                canChangeSettings={true}
                style={this.props.styles.editEmailButton}
              />
            </View>
            <View style={this.props.styles.row}>
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
          {/* <View style={this.props.styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressFriendList}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Friend list</Text>
              <Icon name="ios-arrow-forward" size={20} color={linkColor} />
            </Button>
            <Button
              onPress={this.onPressBlockList}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Block list</Text>
              <Icon name="ios-arrow-forward" size={20} color={linkColor} />
            </Button>
          </View> */}
          <Text style={this.props.styles.header}>PREFERENCES</Text>
          <View style={this.props.styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressAppearance}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Appearance</Text>
              <Icon name="ios-arrow-forward" size={20} color={linkColor} />
            </Button>
          </View>
          <View style={this.props.styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressBuildInfo}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Build info</Text>
              <Icon name="ios-arrow-forward" size={20} color={linkColor} />
            </Button>
            <Button
              onPress={this.onPressDevTools}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Developer tools</Text>
              <Icon name="ios-arrow-forward" size={20} color={linkColor} />
            </Button>
          </View>
          <View style={this.props.styles.unpaddedSection}>
            <Button
              onPress={this.onPressDeleteAccount}
              style={this.props.styles.deleteAccountButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
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
    const alertTitle =
      Platform.OS === 'ios' ? 'Keep Login Info in Keychain' : 'Keep Login Info';
    const sharedWebCredentials = getNativeSharedWebCredentials();
    const alertDescription = sharedWebCredentials
      ? 'We will automatically fill out log-in forms with your credentials ' +
        'in the app and keep them available on squadcal.org in Safari.'
      : 'We will automatically fill out log-in forms with your credentials ' +
        'in the app.';
    Alert.alert(alertTitle, alertDescription, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Keep', onPress: this.logOutButKeepNativeCredentialsWrapper },
      {
        text: 'Remove',
        onPress: this.logOutAndDeleteNativeCredentialsWrapper,
        style: 'destructive',
      },
    ]);
  };

  logOutButKeepNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(logOutActionTypes, this.logOut());
  };

  logOutAndDeleteNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionTypes,
      this.logOutAndDeleteNativeCredentials(),
    );
  };

  logOut() {
    return this.props.logOut(this.props.preRequestUserState);
  }

  async logOutAndDeleteNativeCredentials() {
    const { username } = this;
    invariant(username, "can't log out if not logged in");
    await deleteNativeCredentialsFor(username);
    return await this.logOut();
  }

  onPressResendVerificationEmail = () => {
    this.props.dispatchActionPromise(
      resendVerificationEmailActionTypes,
      this.resendVerificationEmailAction(),
    );
  };

  async resendVerificationEmailAction() {
    await this.props.resendVerificationEmail();
    Alert.alert(
      'Verify email',
      "We've sent you an email to verify your email address. Just click on " +
        'the link in the email to complete the verification process.',
    );
  }

  navigateIfActive(name) {
    this.props.navigation.navigate({ name });
  }

  onPressEditEmail = () => {
    this.navigateIfActive(EditEmailRouteName);
  };

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

  onPressFriendList = () => {
    this.navigateIfActive(FriendListRouteName);
  };

  onPressBlockList = () => {
    this.navigateIfActive(BlockListRouteName);
  };
}

const styles = {
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
  editEmailButton: {
    paddingTop: Platform.OS === 'android' ? 9 : 7,
  },
  editPasswordButton: {
    paddingTop: Platform.OS === 'android' ? 3 : 2,
  },
  emailNotVerified: {
    color: 'redText',
  },
  emailVerified: {
    color: 'greenText',
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
  logOutText: {
    color: 'link',
    fontSize: 16,
    paddingLeft: 6,
  },
  resendVerificationEmailButton: {
    flexDirection: 'row',
    paddingRight: 1,
  },
  resendVerificationEmailSpinner: {
    marginTop: Platform.OS === 'ios' ? -4 : 0,
    paddingHorizontal: 4,
  },
  resendVerificationEmailText: {
    color: 'link',
    fontStyle: 'italic',
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
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  slightlyPaddedSection: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
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
  },
  value: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    textAlign: 'right',
  },
  verification: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    height: 20,
  },
  verificationText: {
    color: 'panelForegroundLabel',
    fontSize: 13,
    fontStyle: 'italic',
  },
};
const stylesSelector = styleSelector(styles);

registerFetchKey(logOutActionTypes);
const resendVerificationLoadingStatusSelector = createLoadingStatusSelector(
  resendVerificationEmailActionTypes,
);

export default connect(
  (state: AppState) => ({
    currentUserInfo: state.currentUserInfo,
    preRequestUserState: preRequestUserStateSelector(state),
    resendVerificationLoadingStatus: resendVerificationLoadingStatusSelector(
      state,
    ),
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { logOut, resendVerificationEmail },
)(MoreScreen);
