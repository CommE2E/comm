// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type {
  LogInInfo,
  LogInExtraInfo,
  LogInResult,
} from 'lib/types/account-types';
import {
  type StateContainer,
  stateContainerPropType,
} from '../utils/state-container';

import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Keyboard,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import { connect } from 'lib/utils/redux-utils';
import {
  logInActionTypes,
  logIn,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';

import { TextInput, usernamePlaceholder } from './modal-components.react';
import {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
} from './panel-components.react';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials';

export type LogInState = {
  usernameOrEmailInputText: string,
  passwordInputText: string,
};
type Props = {
  setActiveAlert: (activeAlert: bool) => void,
  opacityValue: Animated.Value,
  onePasswordSupported: bool,
  innerRef: (logInPanel: LogInPanel) => void,
  state: StateContainer<LogInState>,
  // Redux state
  loadingStatus: LoadingStatus,
  logInExtraInfo: () => LogInExtraInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logIn: (logInInfo: LogInInfo) => Promise<LogInResult>,
};
class LogInPanel extends React.PureComponent<Props> {

  static propTypes = {
    setActiveAlert: PropTypes.func.isRequired,
    opacityValue: PropTypes.object.isRequired,
    onePasswordSupported: PropTypes.bool.isRequired,
    innerRef: PropTypes.func.isRequired,
    state: stateContainerPropType.isRequired,
    loadingStatus: PropTypes.string.isRequired,
    logInExtraInfo: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logIn: PropTypes.func.isRequired,
  };
  usernameOrEmailInput: ?TextInput;
  passwordInput: ?TextInput;

  componentDidMount() {
    this.props.innerRef(this);
    this.attemptToFetchCredentials();
  }

  async attemptToFetchCredentials() {
    const credentials = await fetchNativeCredentials();
    if (credentials) {
      this.props.state.setState({
        usernameOrEmailInputText: credentials.username,
        passwordInputText: credentials.password,
      });
    }
  }

  render() {
    let onePassword = null;
    let passwordStyle = {};
    if (this.props.onePasswordSupported) {
      onePassword = (
        <PanelOnePasswordButton onPress={this.onPressOnePassword} />
      );
      passwordStyle = { paddingRight: 30 };
    }
    return (
      <Panel opacityValue={this.props.opacityValue}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.props.state.state.usernameOrEmailInputText}
            onChangeText={this.onChangeUsernameOrEmailInputText}
            placeholder={usernamePlaceholder}
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusPasswordInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.usernameOrEmailInputRef}
          />
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={[styles.input, passwordStyle]}
            value={this.props.state.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="Password"
            secureTextEntry={true}
            returnKeyType='go'
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.passwordInputRef}
          />
          {onePassword}
        </View>
        <PanelButton
          text="LOG IN"
          loadingStatus={this.props.loadingStatus}
          onSubmit={this.onSubmit}
        />
      </Panel>
    );
  }

  usernameOrEmailInputRef = (usernameOrEmailInput: ?TextInput) => {
    this.usernameOrEmailInput = usernameOrEmailInput;
  }

  focusUsernameOrEmailInput = () => {
    invariant(this.usernameOrEmailInput, "ref should be set");
    this.usernameOrEmailInput.focus();
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  focusPasswordInput = () => {
    invariant(this.passwordInput, "ref should be set");
    this.passwordInput.focus();
  }

  onChangeUsernameOrEmailInputText = (text: string) => {
    this.props.state.setState({ usernameOrEmailInputText: text });
  }

  onChangePasswordInputText = (text: string) => {
    this.props.state.setState({ passwordInputText: text });
  }

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (
      this.props.state.state.usernameOrEmailInputText.search(
        validUsernameRegex,
      ) === -1 &&
      this.props.state.state.usernameOrEmailInputText.search(
        validEmailRegex,
      ) === -1
    ) {
      Alert.alert(
        "Invalid username",
        "Alphanumeric usernames or emails only",
        [
          { text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    } else if (this.props.state.state.passwordInputText === "") {
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }

    Keyboard.dismiss();
    const extraInfo = this.props.logInExtraInfo();
    this.props.dispatchActionPromise(
      logInActionTypes,
      this.logInAction(extraInfo),
      undefined,
      { calendarQuery: extraInfo.calendarQuery },
    );
  }

  onUsernameOrEmailAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        usernameOrEmailInputText: "",
      },
      () => {
        invariant(this.usernameOrEmailInput, "ref should exist");
        this.usernameOrEmailInput.focus();
      },
    );
  }

  async logInAction(extraInfo: LogInExtraInfo) {
    try {
      const result = await this.props.logIn({
        usernameOrEmail: this.props.state.state.usernameOrEmailInputText,
        password: this.props.state.state.passwordInputText,
        ...extraInfo,
      });
      this.props.setActiveAlert(false);
      await setNativeCredentials({
        username: result.currentUserInfo.username,
        password: this.props.state.state.passwordInputText,
      });
      return result;
    } catch (e) {
      if (e.message === 'invalid_parameters') {
        Alert.alert(
          "Invalid username",
          "User doesn't exist",
          [
            { text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else if (e.message === 'invalid_credentials') {
        Alert.alert(
          "Incorrect password",
          "The password you entered is incorrect",
          [
            { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
          ],
          { cancelable: false },
        );
      } else if (e.message === 'client_version_unsupported') {
        const app = Platform.select({
          ios: "Testflight",
          android: "Play Store",
        });
        Alert.alert(
          "App out of date",
          "Your app version is pretty old, and the server doesn't know how " +
            `to speak to it anymore. Please use the ${app} app to update!`,
          [
            { text: 'OK', onPress: this.onAppOutOfDateAlertAcknowledged },
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
      throw e;
    }
  }

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        passwordInputText: "",
      },
      () => {
        invariant(this.passwordInput, "passwordInput ref unset");
        this.passwordInput.focus();
      },
    );
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        usernameOrEmailInputText: "",
        passwordInputText: "",
      },
      () => {
        invariant(this.usernameOrEmailInput, "ref should exist");
        this.usernameOrEmailInput.focus();
      },
    );
  }

  onAppOutOfDateAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.props.state.setState({
        usernameOrEmailInputText: credentials.username,
        passwordInputText: credentials.password,
      });
      this.onSubmit();
    } catch (e) { }
  }

}

export type InnerLogInPanel = LogInPanel;

const styles = StyleSheet.create({
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);

export default connect(
  (state: AppState) => ({
    loadingStatus: loadingStatusSelector(state),
    logInExtraInfo: logInExtraInfoSelector(state),
  }),
  { logIn },
)(LogInPanel);
