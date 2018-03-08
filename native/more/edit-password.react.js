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
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import Button from '../components/button.react';
import OnePasswordButton from '../components/one-password-button.react';
import { setNativeCredentials } from '../account/native-credentials';

type Props = {
  navigation: NavigationScreenProp<*>,
  // Redux state
  loadingStatus: LoadingStatus,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  changeUserSettings: (
    accountUpdate: AccountUpdate,
  ) => Promise<ChangeUserSettingsResult>,
};
type State = {|
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
  onePasswordSupported: bool,
|};
class InnerEditPassword extends React.PureComponent<Props, State> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    loadingStatus: loadingStatusPropType.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    changeUserSettings: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Change password",
  };
  mounted = false;
  currentPasswordInput: ?TextInput;
  newPasswordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
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
    let onePasswordCurrentPasswordButton = null;
    let onePasswordNewPasswordButton = null;
    if (this.state.onePasswordSupported) {
      onePasswordCurrentPasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePasswordCurrentPassword}
          style={styles.onePasswordButton}
        />
      );
      onePasswordNewPasswordButton = (
        <OnePasswordButton
          onPress={this.onPressOnePasswordNewPassword}
          style={styles.onePasswordButton}
        />
      );
    }
    const buttonContent = this.props.loadingStatus === "loading"
      ? <ActivityIndicator size="small" color="white" />
      : <Text style={styles.saveText}>Save</Text>;
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.header}>CURRENT PASSWORD</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              underlineColorAndroid="transparent"
              value={this.state.currentPassword}
              onChangeText={this.onChangeCurrentPassword}
              placeholder="Current password"
              secureTextEntry={true}
              autoFocus={true}
              returnKeyType="next"
              onSubmitEditing={this.focusNewPassword}
              ref={this.currentPasswordRef}
            />
            {onePasswordCurrentPasswordButton}
          </View>
        </View>
        <Text style={styles.header}>NEW PASSWORD</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              underlineColorAndroid="transparent"
              value={this.state.newPassword}
              onChangeText={this.onChangeNewPassword}
              placeholder="New password"
              secureTextEntry={true}
              returnKeyType="next"
              onSubmitEditing={this.focusConfirmPassword}
              ref={this.newPasswordRef}
            />
            {onePasswordNewPasswordButton}
          </View>
          <View style={styles.hr} />
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              underlineColorAndroid="transparent"
              value={this.state.confirmPassword}
              onChangeText={this.onChangeConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry={true}
              returnKeyType="go"
              onSubmitEditing={this.submitPassword}
              ref={this.confirmPasswordRef}
            />
          </View>
        </View>
        <Button
          onPress={this.submitPassword}
          style={styles.saveButton}
        >
          {buttonContent}
        </Button>
      </ScrollView>
    );
  }

  onChangeCurrentPassword = (currentPassword: string) => {
    this.setState({ currentPassword });
  }

  currentPasswordRef = (currentPasswordInput: ?TextInput) => {
    this.currentPasswordInput = currentPasswordInput;
  }

  focusCurrentPassword = () => {
    invariant(this.currentPasswordInput, "currentPasswordInput should be set");
    this.currentPasswordInput.focus();
  }

  onChangeNewPassword = (newPassword: string) => {
    this.setState({ newPassword });
  }

  newPasswordRef = (newPasswordInput: ?TextInput) => {
    this.newPasswordInput = newPasswordInput;
  }

  focusNewPassword = () => {
    invariant(this.newPasswordInput, "newPasswordInput should be set");
    this.newPasswordInput.focus();
  }

  onChangeConfirmPassword = (confirmPassword: string) => {
    this.setState({ confirmPassword });
  }

  confirmPasswordRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  }

  focusConfirmPassword = () => {
    invariant(this.confirmPasswordInput, "confirmPasswordInput should be set");
    this.confirmPasswordInput.focus();
  }

  onPressOnePasswordCurrentPassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState(
        { currentPassword: credentials.password },
        () => {
          if (
            this.state.newPassword &&
            this.state.newPassword === this.state.confirmPassword
          ) {
            this.submitPassword();
          }
        },
      );
    } catch (e) { }
  }

  onPressOnePasswordNewPassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState(
        {
          newPassword: credentials.password,
          confirmPassword: credentials.password,
        },
        () => {
          if (this.state.currentPassword) {
            this.submitPassword();
          }
        },
      );
    } catch (e) { }
  }

  submitPassword = () => {
    if (this.state.newPassword === '') {
      Alert.alert(
        "Empty password",
        "New password cannot be empty",
        [
          { text: 'OK', onPress: this.onNewPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.newPassword !== this.state.confirmPassword) {
      Alert.alert(
        "Passwords don't match",
        "New password fields must contain the same password",
        [
          { text: 'OK', onPress: this.onNewPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
    } else if (this.state.newPassword === this.state.currentPassword) {
      this.props.navigation.goBack();
    } else {
      this.props.dispatchActionPromise(
        changeUserSettingsActionTypes,
        this.savePassword(),
      );
    }
  }

  async savePassword() {
    try {
      const result = await this.props.changeUserSettings({
        updatedFields: {
          password: this.state.newPassword,
        },
        currentPassword: this.state.currentPassword,
      });
      await setNativeCredentials({
        password: this.state.newPassword,
      });
      this.props.navigation.goBack();
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The current password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onCurrentPasswordAlertAcknowledged },
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

  onNewPasswordAlertAcknowledged = () => {
    this.setState(
      { newPassword: "", confirmPassword: "" },
      this.focusNewPassword,
    );
  }

  onCurrentPasswordAlertAcknowledged = () => {
    this.setState(
      { currentPassword: "" },
      this.focusCurrentPassword,
    );
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.setState(
      { currentPassword: "", newPassword: "", confirmPassword: "" },
      this.focusCurrentPassword,
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
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: Platform.select({
      ios: 3,
      default: 2,
    }),
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Platform.select({
      ios: 9,
      default: 6,
    }),
    paddingHorizontal: 24,
  },
  hr: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 15,
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

const EditPasswordRouteName = 'EditPassword';
const EditPassword = connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
  }),
  { changeUserSettings },
)(InnerEditPassword);

export {
  EditPassword,
  EditPasswordRouteName,
};
