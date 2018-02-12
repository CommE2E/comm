// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';
import type { LogOutResult } from 'lib/actions/user-actions';
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
import { connect } from 'react-redux';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-navigation';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
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

type Props = {
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
    username: PropTypes.string,
    email: PropTypes.string,
    emailVerified: PropTypes.bool,
    currentAsOf: PropTypes.number.isRequired,
    resendVerificationLoadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
    resendVerificationEmail: PropTypes.func.isRequired,
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
      <SafeAreaView
        forceInset={{ top: 'always', bottom: 'never' }}
        style={styles.container}
      >
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ACCOUNT</Text>
            <Button onPress={this.onPressEditAccount}>
              <Text style={styles.editButton}>EDIT</Text>
            </Button>
          </View>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{this.props.email}</Text>
            </View>
            {emailVerified}
            <View style={styles.row}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.value}>••••••••••••••••</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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
    await Promise.all([
      this.props.logOut(),
      deleteNativeCredentialsFor(username),
    ]);
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

  onPressEditAccount = () => {
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingVertical: 16,
  },
  section: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: "#CCCCCC",
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: "#888888",
  },
  username: {
    color: "#000000",
  },
  value: {
    color: "#000000",
    fontSize: 16,
  },
  logOutText: {
    fontSize: 16,
    color: "#036AFF",
    paddingLeft: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 3,
  },
  headerTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  editButton: {
    fontSize: 12,
    fontWeight: "400",
    color: "#036AFF",
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
});

registerFetchKey(logOutActionTypes);
registerFetchKey(resendVerificationEmailActionTypes);
const resendVerificationLoadingStatusSelector = createLoadingStatusSelector(
  resendVerificationEmailActionTypes,
);

const MoreScreenRouteName = 'MoreScreen';
const MoreScreen = connect(
  (state: AppState) => ({
    cookie: state.cookie,
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
  includeDispatchActionProps,
  bindServerCalls({ logOut, resendVerificationEmail }),
)(InnerMoreScreen);

export {
  MoreScreen,
  MoreScreenRouteName,
};
