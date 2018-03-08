// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { NavigationScreenProp } from 'react-navigation';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { LogOutResult } from 'lib/types/account-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';

import { connect } from 'lib/utils/redux-utils';
import {
  deleteAccountActionTypes,
  deleteAccount,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { deleteNativeCredentialsFor } from '../account/native-credentials';

type Props = {|
  navigation: NavigationScreenProp<*>,
  // Redux state
  loadingStatus: LoadingStatus,
  username: ?string,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  deleteAccount: (password: string) => Promise<LogOutResult>,
|};
type State = {|
  password: string,
  onePasswordSupported: bool,
|};
class InnerDeleteAccount extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    username: PropTypes.string,
    dispatchActionPromise: PropTypes.func.isRequired,
    deleteAccount: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Delete account",
  };
  mounted = false;
  passwordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: "",
      onePasswordSupported: false,
    };
    this.determineOnePasswordSupport();
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  async determineOnePasswordSupport() {
    let onePasswordSupported;
    try {
      onePasswordSupported = await OnePassword.isSupported();
    } catch (e) {
      onePasswordSupported = false;
    }
    if (this.mounted) {
      this.setState({ onePasswordSupported });
    }
  }

  render() {
    let onePasswordButton = null;
    if (this.state.onePasswordSupported) {
      onePasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePassword}
          style={styles.onePasswordButton}
        />
      );
    }
    const buttonContent = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" color="white" />
      : <Text style={styles.saveText}>Delete account</Text>;
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View>
          <Text style={styles.warningText}>
            Your account will be permanently deleted.
          </Text>
        </View>
        <View>
          <Text style={[styles.warningText, styles.lastWarningText]}>
            There is no way to reverse this.
          </Text>
        </View>
        <Text style={styles.header}>PASSWORD</Text>
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            underlineColorAndroid="transparent"
            value={this.state.password}
            onChangeText={this.onChangePasswordText}
            placeholder="Password"
            secureTextEntry={true}
            returnKeyType="go"
            onSubmitEditing={this.submitDeletion}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
        </View>
        <Button
          onPress={this.submitDeletion}
          style={styles.deleteButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangePasswordText = (newPassword: string) => {
    this.setState({ password: newPassword });
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  focusPasswordInput = () => {
    invariant(this.passwordInput, "passwordInput should be set");
    this.passwordInput.focus();
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState({ password: credentials.password });
    } catch (e) { }
  }

  submitDeletion = () => {
    this.props.dispatchActionPromise(
      deleteAccountActionTypes,
      this.deleteAccount(),
    );
  }

  async deleteAccount() {
    try {
      const result = await this.props.deleteAccount(this.state.password);
      if (this.props.username) {
        await deleteNativeCredentialsFor(this.props.username);
      }
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
    }
  }

  onErrorAlertAcknowledged = () => {
    this.setState(
      { password: "" },
      this.focusPasswordInput,
    );
  }

}

const styles = StyleSheet.create({
  scrollView: {
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: Platform.select({
      ios: 12,
      default: 8,
    }),
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
    paddingVertical: 0,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#BB8888",
    marginVertical: 12,
    marginHorizontal: 24,
    borderRadius: 5,
    padding: 12,
  },
  saveText: {
    fontSize: 18,
    textAlign: 'center',
    color: "white",
  },
  onePasswordButton: {
    marginLeft: 6,
  },
  warningText: {
    marginHorizontal: 24,
    textAlign: 'center',
    color: "#333333",
    fontSize: 16,
  },
  lastWarningText: {
    marginBottom: 24,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(
  deleteAccountActionTypes,
);

const DeleteAccountRouteName = 'DeleteAccount';
const DeleteAccount = connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    username: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.username
      : undefined,
  }),
  { deleteAccount },
)(InnerDeleteAccount);

export {
  DeleteAccount,
  DeleteAccountRouteName,
};
