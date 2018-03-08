// @flow

import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { NavigationScreenProp } from 'react-navigation';
import type { LoadingStatus } from 'lib/types/loading-types';
import { loadingStatusPropType } from 'lib/types/loading-types';
import type { AccountUpdate } from 'lib/types/user-types';
import type { ChangeUserSettingsResult } from 'lib/types/account-types';

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
  changeUserSettingsActionTypes,
  changeUserSettings,
} from 'lib/actions/user-actions';
import { validEmailRegex } from 'lib/shared/account-regexes';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';

type Props = {|
  navigation: NavigationScreenProp<*>,
  // Redux state
  email: ?string,
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
|};
type State = {|
  email: string,
  password: string,
  onePasswordSupported: bool,
|};
class InnerEditEmail extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    email: PropTypes.string,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };
  static navigationOptions = ({ navigation }) => ({
    headerTitle: "Change email",
  });
  mounted = false;
  passwordInput: ?TextInput;
  emailInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      email: props.email ? props.email : "",
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
      : <Text style={styles.saveText}>Save</Text>;
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.header}>EMAIL</Text>
        <View style={styles.section}>
          <TextInput
            style={styles.input}
            underlineColorAndroid="transparent"
            value={this.state.email}
            onChangeText={this.onChangeEmailText}
            placeholder="Email"
            autoFocus={true}
            selectTextOnFocus={true}
            returnKeyType="next"
            onSubmitEditing={this.focusPasswordInput}
            ref={this.emailInputRef}
          />
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
            onSubmitEditing={this.submitEmail}
            ref={this.passwordInputRef}
          />
          {onePasswordButton}
        </View>
        <Button
          onPress={this.submitEmail}
          style={styles.saveButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangeEmailText = (newEmail: string) => {
    this.setState({ email: newEmail });
  }

  emailInputRef = (emailInput: ?TextInput) => {
    this.emailInput = emailInput;
  }

  focusEmailInput = () => {
    invariant(this.emailInput, "emailInput should be set");
    this.emailInput.focus();
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
      this.setState(
        { password: credentials.password },
        () => {
          if (this.state.email && this.state.email !== this.props.email) {
            this.submitEmail();
          }
        },
      );
    } catch (e) { }
  }

  submitEmail = () => {
    if (this.state.email.search(validEmailRegex) === -1) {
      Alert.alert(
        "Invalid email address",
        "Valid email addresses only",
        [
          { text: 'OK', onPress: this.onEmailAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.password === "") {
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.email === this.props.email) {
      this.props.navigation.goBack();
    } else {
      this.props.dispatchActionPromise(
        changeUserSettingsActionTypes,
        this.saveEmail(),
      );
    }
  }

  async saveEmail() {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          email: this.state.email,
        },
        currentPassword: this.state.password,
      });
      this.props.navigation.goBack();
      Alert.alert(
        "Verify email",
        "We've sent you an email to verify your email address. Just click on " +
          "the link in the email to complete the verification process.",
      );
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          "Unknown error",
          "Uhh... try again?",
          [
            { text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged },
          ],
          { cancelable: false },
        );
      }
    }
  }

  onEmailAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : "";
    this.setState(
      { email: resetEmail },
      this.focusEmailInput,
    );
  }

  onPasswordAlertAcknowledged = () => {
    this.setState(
      { password: "" },
      this.focusPasswordInput,
    );
  }

  onUnknownErrorAlertAcknowledged = () => {
    const resetEmail = this.props.email ? this.props.email : "";
    this.setState(
      { email: resetEmail, password: "" },
      this.focusEmailInput,
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
  saveButton: {
    flex: 1,
    backgroundColor: "#88BB88",
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
});

const loadingStatusSelector = createLoadingStatusSelector(
  changeUserSettingsActionTypes,
);

const EditEmailRouteName = 'EditEmail';
const EditEmail = connect(
  (state: AppState) => ({
    email: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.email
      : undefined,
    loadingStatus: loadingStatusSelector(state),
  }),
  { changeUserSettings },
)(InnerEditEmail);

export {
  EditEmail,
  EditEmailRouteName,
};
