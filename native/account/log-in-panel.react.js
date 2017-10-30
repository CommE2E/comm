// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { LogInResult } from 'lib/actions/user-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Keyboard,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import PropTypes from 'prop-types';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import {
  logInActionTypes,
  logInAndFetchInitialData,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { currentCalendarQuery } from 'lib/selectors/nav-selectors';

import { TextInput } from './modal-components.react';
import {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
} from './panel-components.react';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials';

type Props = {
  setActiveAlert: (activeAlert: bool) => void,
  opacityValue: Animated.Value,
  onePasswordSupported: bool,
  innerRef: (logInPanel: LogInPanel) => void,
  // Redux state
  loadingStatus: LoadingStatus,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logInAndFetchInitialData: (
    username: string,
    password: string,
    calendarQuery: CalendarQuery,
  ) => Promise<LogInResult>,
};
type State = {
  usernameOrEmailInputText: string,
  passwordInputText: string,
};
class LogInPanel extends React.PureComponent<Props, State> {

  static propTypes = {
    setActiveAlert: PropTypes.func.isRequired,
    opacityValue: PropTypes.object.isRequired,
    onePasswordSupported: PropTypes.bool.isRequired,
    innerRef: PropTypes.func.isRequired,
    loadingStatus: PropTypes.string.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logInAndFetchInitialData: PropTypes.func.isRequired,
  };
  state = {
    usernameOrEmailInputText: "",
    passwordInputText: "",
  };
  usernameOrEmailInput: ?TextInput;
  passwordInput: ?TextInput;

  componentDidMount() {
    this.props.innerRef(this);
    this.attemptToFetchCredentials().then();
  }

  async attemptToFetchCredentials() {
    const credentials = await fetchNativeCredentials();
    if (credentials) {
      this.setState({
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
            value={this.state.usernameOrEmailInputText}
            onChangeText={this.onChangeUsernameOrEmailInputText}
            placeholder="Username or email address"
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
            value={this.state.passwordInputText}
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
    this.setState({ usernameOrEmailInputText: text });
  }

  onChangePasswordInputText = (text: string) => {
    this.setState({ passwordInputText: text });
  }

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (
      this.state.usernameOrEmailInputText.search(validUsernameRegex) === -1 &&
      this.state.usernameOrEmailInputText.search(validEmailRegex) === -1
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
    }

    Keyboard.dismiss();
    const calendarQuery = this.props.currentCalendarQuery();
    this.props.dispatchActionPromise(
      logInActionTypes,
      this.logInAction(calendarQuery),
      undefined,
      { calendarQuery },
    );
  }

  onUsernameOrEmailAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        usernameOrEmailInputText: "",
      },
      () => {
        invariant(this.usernameOrEmailInput, "ref should exist");
        this.usernameOrEmailInput.focus();
      },
    );
  }

  async logInAction(calendarQuery: CalendarQuery) {
    try {
      const result = await this.props.logInAndFetchInitialData(
        this.state.usernameOrEmailInputText,
        this.state.passwordInputText,
        calendarQuery,
      );
      this.props.setActiveAlert(false);
      await setNativeCredentials({
        username: result.currentUserInfo.username,
        password: this.state.passwordInputText,
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
    this.setState(
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
    this.setState(
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

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState({
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
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
    currentCalendarQuery: currentCalendarQuery(state),
  }),
  includeDispatchActionProps,
  bindServerCalls({ logInAndFetchInitialData }),
)(LogInPanel);
