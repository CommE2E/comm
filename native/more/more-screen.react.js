// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { CalendarQuery } from 'lib/types/entry-types';
import type { LogOutResult } from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';

import React from 'react';
import {
  View,
  StyleSheet,
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
import { EditEmailRouteName } from './edit-email.react';
import { EditPasswordRouteName } from './edit-password.react';
import { DeleteAccountRouteName } from './delete-account.react';
import { BuildInfoRouteName} from './build-info.react';
import { DevToolsRouteName} from './dev-tools.react';

type Props = {
  navigation: NavigationScreenProp<*>,
  // Redux state
  username: ?string,
  email: ?string,
  emailVerified: ?bool,
  currentAsOf: number,
  resendVerificationLoadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: () => Promise<LogOutResult>,
  resendVerificationEmail: () => Promise<void>,
};
class InnerMoreScreen extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    username: PropTypes.string,
    email: PropTypes.string,
    emailVerified: PropTypes.bool,
    currentAsOf: PropTypes.number.isRequired,
    resendVerificationLoadingStatus: loadingStatusPropType.isRequired,
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
          styles.verification,
          styles.verificationText,
          styles.emailVerified,
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
            style={styles.resendVerificationEmailSpinner}
          />
        );
      }
      emailVerified = (
        <View style={styles.verification}>
          <Text style={[styles.verificationText, styles.emailNotVerified]}>
            Not verified
          </Text>
          <Text style={styles.verificationText}>{" - "}</Text>
          <Button
            onPress={this.onPressResendVerificationEmail}
            style={styles.resendVerificationEmailButton}
          >
            {resendVerificationEmailSpinner}
            <Text style={[
              styles.verificationText,
              styles.resendVerificationEmailText,
            ]}>
              resend verification email
            </Text>
          </Button>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {"Logged in as "}
                <Text style={styles.username}>{this.props.username}</Text>
              </Text>
              <Button onPress={this.onPressLogOut}>
                <Text style={styles.logOutText}>Log out</Text>
              </Button>
            </View>
          </View>
          <Text style={styles.header}>ACCOUNT</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.content}>
                <Text style={styles.value} numberOfLines={1}>
                  {this.props.email}
                </Text>
                {emailVerified}
              </View>
              <EditSettingButton
                onPress={this.onPressEditEmail}
                canChangeSettings={true}
                style={styles.editEmailButton}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Password</Text>
              <Text style={[styles.content, styles.value]} numberOfLines={1}>
                ••••••••••••••••
              </Text>
              <EditSettingButton
                onPress={this.onPressEditPassword}
                canChangeSettings={true}
                style={styles.editPasswordButton}
              />
            </View>
          </View>
          <View style={styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressBuildInfo}
              style={styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.submenuText}>Build info</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color="#036AFF"
              />
            </Button>
            <Button
              onPress={this.onPressDevTools}
              style={styles.submenuButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.submenuText}>Developer tools</Text>
              <Icon
                name="ios-arrow-forward"
                size={20}
                color="#036AFF"
              />
            </Button>
          </View>
          <View style={styles.unpaddedSection}>
            <Button
              onPress={this.onPressDeleteAccount}
              style={styles.deleteAccountButton}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.deleteAccountText}>Delete account...</Text>
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  onPressLogOut = async () => {
    const alertTitle = Platform.OS === "ios"
      ? "Keep Login Info in Keychain"
      : "Keep Login Info";
    const sharedWebCredentials = await getNativeSharedWebCredentials();
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
    const [ result ] = await Promise.all([
      this.props.logOut(),
      deleteNativeCredentialsFor(username),
    ]);
    return result;
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

  onPressEditEmail = () => {
    this.props.navigation.navigate(EditEmailRouteName);
  }

  onPressEditPassword = () => {
    this.props.navigation.navigate(EditPasswordRouteName);
  }

  onPressDeleteAccount = () => {
    this.props.navigation.navigate(DeleteAccountRouteName);
  }

  onPressBuildInfo = () => {
    this.props.navigation.navigate(BuildInfoRouteName);
  }

  onPressDevTools = () => {
    this.props.navigation.navigate(DevToolsRouteName);
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingVertical: 24,
  },
  section: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  unpaddedSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    marginBottom: 24,
  },
  slightlyPaddedSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    marginBottom: 24,
    paddingVertical: 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    color: "#888888",
    paddingRight: 12,
  },
  username: {
    color: "#000000",
  },
  value: {
    color: "#000000",
    fontSize: 16,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  logOutText: {
    fontSize: 16,
    color: "#036AFF",
    paddingLeft: 6,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
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
    color: 'green',
  },
  emailNotVerified: {
    color: 'red',
  },
  resendVerificationEmailButton: {
    flexDirection: 'row',
    paddingRight: 1,
  },
  resendVerificationEmailText: {
    fontStyle: 'italic',
    color: "#036AFF",
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
    color: "#AA0000",
    flex: 1,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  submenuText: {
    color: 'black',
    fontSize: 16,
    flex: 1,
  },
});

registerFetchKey(logOutActionTypes);
const resendVerificationLoadingStatusSelector = createLoadingStatusSelector(
  resendVerificationEmailActionTypes,
);

const MoreScreenRouteName = 'MoreScreen';
const MoreScreen = connect(
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
    currentAsOf: state.currentAsOf,
    resendVerificationLoadingStatus:
      resendVerificationLoadingStatusSelector(state),
  }),
  { logOut, resendVerificationEmail },
)(InnerMoreScreen);

export {
  MoreScreen,
  MoreScreenRouteName,
};
