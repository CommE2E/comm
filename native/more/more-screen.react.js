// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux/redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { LogOutResult } from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { Styles } from '../types/styles';
import type { Colors } from '../themes/colors';

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
} from '../navigation/route-names';
import { colorsSelector, styleSelector } from '../themes/colors';

type Props = {
  navigation: NavigationScreenProp<*>,
  // Redux state
  username: ?string,
  email: ?string,
  emailVerified: ?bool,
  resendVerificationLoadingStatus: LoadingStatus,
  colors: Colors,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: () => Promise<LogOutResult>,
  resendVerificationEmail: () => Promise<void>,
};
class MoreScreen extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    username: PropTypes.string,
    email: PropTypes.string,
    emailVerified: PropTypes.bool,
    resendVerificationLoadingStatus: loadingStatusPropType.isRequired,
    colors: PropTypes.objectOf(PropTypes.string).isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
    resendVerificationEmail: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "More",
  };

  render() {
    let emailVerified = null;
    if (this.props.emailVerified === true) {
      emailVerified = (
        <Text style={[
          this.props.styles.verification,
          this.props.styles.verificationText,
          this.props.styles.emailVerified,
        ]}>
          Verified
        </Text>
      );
    } else if (this.props.emailVerified === false) {
      let resendVerificationEmailSpinner;
      if (this.props.resendVerificationLoadingStatus === "loading") {
        resendVerificationEmailSpinner = (
          <ActivityIndicator
            size="small"
            style={this.props.styles.resendVerificationEmailSpinner}
          />
        );
      }
      emailVerified = (
        <View style={this.props.styles.verification}>
          <Text style={[
            this.props.styles.verificationText,
            this.props.styles.emailNotVerified,
          ]}>
            Not verified
          </Text>
          <Text style={this.props.styles.verificationText}>{" - "}</Text>
          <Button
            onPress={this.onPressResendVerificationEmail}
            style={this.props.styles.resendVerificationEmailButton}
          >
            {resendVerificationEmailSpinner}
            <Text style={[
              this.props.styles.verificationText,
              this.props.styles.resendVerificationEmailText,
            ]}>
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
                {"Logged in as "}
                <Text style={this.props.styles.username}>
                  {this.props.username}
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
                <Text style={this.props.styles.value} numberOfLines={1}>
                  {this.props.email}
                </Text>
                {emailVerified}
              </View>
              <EditSettingButton
                onPress={this.onPressEditEmail}
                canChangeSettings={true}
                style={this.props.styles.editEmailButton}
              />
            </View>
            <View style={this.props.styles.row}>
              <Text style={this.props.styles.label}>Password</Text>
              <Text style={[
                this.props.styles.content,
                this.props.styles.value,
              ]} numberOfLines={1}>
                ••••••••••••••••
              </Text>
              <EditSettingButton
                onPress={this.onPressEditPassword}
                canChangeSettings={true}
                style={this.props.styles.editPasswordButton}
              />
            </View>
          </View>
          <Text style={this.props.styles.header}>PREFERENCES</Text>
          <View style={this.props.styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressAppearance}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Appearance</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={linkColor}
              />
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
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={linkColor}
              />
            </Button>
            <Button
              onPress={this.onPressDevTools}
              style={this.props.styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.submenuText}>Developer tools</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color={linkColor}
              />
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
    const alertTitle = Platform.OS === "ios"
      ? "Keep Login Info in Keychain"
      : "Keep Login Info";
    const sharedWebCredentials = getNativeSharedWebCredentials();
    const alertDescription = sharedWebCredentials
      ? "We will automatically fill out log-in forms with your credentials " +
        "in the app and keep them available on squadcal.org in Safari."
      : "We will automatically fill out log-in forms with your credentials " +
        "in the app.";
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
    );
  }

  logOutButKeepNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionTypes,
      this.props.logOut(),
    );
  }

  logOutAndDeleteNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionTypes,
      this.logOutAndDeleteNativeCredentials(),
    );
  }

  async logOutAndDeleteNativeCredentials() {
    const username = this.props.username;
    invariant(username, "can't log out if not logged in");
    await deleteNativeCredentialsFor(username);
    return await this.props.logOut();
  }

  onPressResendVerificationEmail = () => {
    this.props.dispatchActionPromise(
      resendVerificationEmailActionTypes,
      this.resendVerificationEmailAction(),
    );
  }

  async resendVerificationEmailAction() {
    await this.props.resendVerificationEmail();
    Alert.alert(
      "Verify email",
      "We've sent you an email to verify your email address. Just click on " +
        "the link in the email to complete the verification process.",
    );
  }

  navigateIfActive(routeName: string) {
    this.props.navigation.navigate({ routeName });
  }

  onPressEditEmail = () => {
    this.navigateIfActive(EditEmailRouteName);
  }

  onPressEditPassword = () => {
    this.navigateIfActive(EditPasswordRouteName);
  }

  onPressDeleteAccount = () => {
    this.navigateIfActive(DeleteAccountRouteName);
  }

  onPressBuildInfo = () => {
    this.navigateIfActive(BuildInfoRouteName);
  }

  onPressDevTools = () => {
    this.navigateIfActive(DevToolsRouteName);
  }

  onPressAppearance = () => {
    this.navigateIfActive(AppearancePreferencesRouteName);
  }

}

const styles = {
  container: {
    flex: 1,
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  unpaddedSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  slightlyPaddedSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
    backgroundColor: 'panelForeground',
    borderColor: 'panelForegroundBorder',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    color: 'panelForegroundTertiaryLabel',
    paddingRight: 12,
  },
  username: {
    color: 'panelForegroundLabel',
  },
  value: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  logOutText: {
    fontSize: 16,
    color: 'link',
    paddingLeft: 6,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: 'panelBackgroundLabel',
  },
  verification: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    height: 20,
  },
  verificationText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emailVerified: {
    color: 'greenText',
  },
  emailNotVerified: {
    color: 'redText',
  },
  resendVerificationEmailButton: {
    flexDirection: 'row',
    paddingRight: 1,
  },
  resendVerificationEmailText: {
    fontStyle: 'italic',
    color: 'link',
  },
  resendVerificationEmailSpinner: {
    paddingHorizontal: 4,
    marginTop: Platform.OS === "ios" ? -4 : 0,
  },
  editEmailButton: {
    paddingTop: Platform.OS === "android" ? 9 : 7,
  },
  editPasswordButton: {
    paddingTop: Platform.OS === "android" ? 3 : 2,
  },
  deleteAccountButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  deleteAccountText: {
    fontSize: 16,
    color: 'redText',
    flex: 1,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  submenuText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    flex: 1,
  },
};
const stylesSelector = styleSelector(styles);

registerFetchKey(logOutActionTypes);
const resendVerificationLoadingStatusSelector = createLoadingStatusSelector(
  resendVerificationEmailActionTypes,
);

export default connect(
  (state: AppState) => ({
    username: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.username
      : undefined,
    email: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.email
      : undefined,
    emailVerified: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.emailVerified
      : undefined,
    resendVerificationLoadingStatus:
      resendVerificationLoadingStatusSelector(state),
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  { logOut, resendVerificationEmail },
)(MoreScreen);
