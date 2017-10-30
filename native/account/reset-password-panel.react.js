// @flow

import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { LogInResult } from 'lib/actions/user-actions';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import React from 'react';
import {
  Alert,
  StyleSheet,
  Animated,
  Keyboard,
  View,
  Text,
} from 'react-native';
import { connect } from 'react-redux';
import invariant from 'invariant';
import OnePassword from 'react-native-onepassword';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';

import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  resetPasswordActionTypes,
  resetPasswordAndFetchInitialData,
} from 'lib/actions/user-actions';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { currentCalendarQuery } from 'lib/selectors/nav-selectors';

import { TextInput } from './modal-components.react';
import {
  PanelButton,
  PanelOnePasswordButton,
  Panel,
} from './panel-components.react';

type Props = {
  verifyCode: string,
  username: string,
  onePasswordSupported: bool,
  onSuccess: () => void,
  setActiveAlert: (activeAlert: bool) => void,
  opacityValue: Animated.Value,
  // Redux state
  loadingStatus: LoadingStatus,
  currentCalendarQuery: () => CalendarQuery,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  resetPasswordAndFetchInitialData: (
    code: string,
    password: string,
    calendarQuery: CalendarQuery,
  ) => Promise<LogInResult>,
};
type State = {
  passwordInputText: string,
  confirmPasswordInputText: string,
};
class ResetPasswordPanel extends React.PureComponent<Props, State> {

  static propTypes = {
    verifyCode: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    onePasswordSupported: PropTypes.bool.isRequired,
    onSuccess: PropTypes.func.isRequired,
    setActiveAlert: PropTypes.func.isRequired,
    opacityValue: PropTypes.object.isRequired,
    loadingStatus: PropTypes.string.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    resetPasswordAndFetchInitialData: PropTypes.func.isRequired,
  };
  state = {
    passwordInputText: "",
    confirmPasswordInputText: "",
  };
  passwordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;

  render() {
    let onePassword = null;
    let passwordStyle = { paddingRight: 0 };
    if (this.props.onePasswordSupported) {
      onePassword = (
        <PanelOnePasswordButton onPress={this.onPressOnePassword} />
      );
      passwordStyle = { paddingRight: 30 };
    }
    return (
      <Panel opacityValue={this.props.opacityValue} style={styles.container}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <View style={styles.usernameContainer}>
            <Text style={styles.usernameText}>{this.props.username}</Text>
          </View>
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={[styles.input, passwordStyle]}
            value={this.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="New password"
            autoFocus={true}
            secureTextEntry={true}
            returnKeyType='next'
            blurOnSubmit={false}
            onSubmitEditing={this.focusConfirmPasswordInput}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.passwordInputRef}
          />
          {onePassword}
        </View>
        <View>
          <TextInput
            style={styles.input}
            value={this.state.confirmPasswordInputText}
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            secureTextEntry={true}
            returnKeyType='go'
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== "loading"}
            ref={this.confirmPasswordInputRef}
          />
        </View>
        <PanelButton
          text="RESET PASSWORD"
          loadingStatus={this.props.loadingStatus}
          onSubmit={this.onSubmit}
        />
      </Panel>
    );
  }

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  }

  confirmPasswordInputRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  }

  focusConfirmPasswordInput = () => {
    invariant(this.confirmPasswordInput, "ref should be set");
    this.confirmPasswordInput.focus();
  }

  onChangePasswordInputText = (text: string) => {
    this.setState({ passwordInputText: text });
  }

  onChangeConfirmPasswordInputText = (text: string) => {
    this.setState({ confirmPasswordInputText: text });
  }

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (this.state.passwordInputText === '') {
      Alert.alert(
        "Empty password",
        "Password cannot be empty",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    } else if (
      this.state.passwordInputText !== this.state.confirmPasswordInputText
    ) {
      Alert.alert(
        "Passwords don't match",
        "Password fields must contain the same password",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      return;
    }
    Keyboard.dismiss();
    const calendarQuery = this.props.currentCalendarQuery();
    this.props.dispatchActionPromise(
      resetPasswordActionTypes,
      this.resetPasswordAction(calendarQuery),
      undefined,
      { calendarQuery },
    );
  }

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.setState(
      {
        passwordInputText: "",
        confirmPasswordInputText: "",
      },
      () => {
        invariant(this.passwordInput, "ref should exist");
        this.passwordInput.focus();
      },
    );
  }

  async resetPasswordAction(calendarQuery: CalendarQuery) {
    try {
      const result = await this.props.resetPasswordAndFetchInitialData(
        this.props.verifyCode,
        this.state.passwordInputText,
        calendarQuery,
      );
      this.props.setActiveAlert(false);
      this.props.onSuccess();
      return result;
    } catch (e) {
      Alert.alert(
        "Unknown error",
        "Uhh... try again?",
        [
          { text: 'OK', onPress: this.onPasswordAlertAcknowledged },
        ],
        { cancelable: false },
      );
      throw e;
    }
  }

  onPressOnePassword = async () => {
    try {
      const credentials = await OnePassword.findLogin("https://squadcal.org");
      this.setState({
        passwordInputText: credentials.password,
        confirmPasswordInputText: credentials.password,
      });
      this.onSubmit();
    } catch (e) { }
  }

}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
  usernameContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#BBBBBB',
    paddingLeft: 35,
  },
  usernameText: {
    paddingTop: 8,
    height: 40,
    fontSize: 20,
    color: '#444',
  },
});

const loadingStatusSelector
  = createLoadingStatusSelector(resetPasswordActionTypes);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
    currentCalendarQuery: currentCalendarQuery(state),
  }),
  includeDispatchActionProps,
  bindServerCalls({ resetPasswordAndFetchInitialData }),
)(ResetPasswordPanel);
