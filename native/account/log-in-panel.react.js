// @flow

import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { LogInResult } from 'lib/actions/user-actions';

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableHighlight,
  Text,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';

import {
  validUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-regexes';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { logInActionType, logIn } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';

import { TextInput } from '../modal-components.react';

class LogInPanel extends React.PureComponent {

  props: {
    navigateToApp: () => void,
    // Redux state
    loadingStatus: LoadingStatus,
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    logIn: (
      username: string,
      password: string,
    ) => Promise<LogInResult>,
  };
  static propTypes = {
    navigateToApp: React.PropTypes.func.isRequired,
    loadingStatus: React.PropTypes.string.isRequired,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    logIn: React.PropTypes.func.isRequired,
  };
  state: {
    usernameOrEmailInputText: string,
    passwordInputText: string,
  } = {
    usernameOrEmailInputText: "",
    passwordInputText: "",
  };
  usernameOrEmailInput: ?TextInput;
  passwordInput: ?TextInput;

  render() {
    let buttonIcon;
    if (this.props.loadingStatus === "loading") {
      buttonIcon = (
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator color="#555" />
        </View>
      );
    } else {
      buttonIcon = (
        <View style={styles.submitContentIconContainer}>
          <Icon name="arrow-right" size={16} color="#555" />
        </View>
      );
    }
    return (
      <View style={styles.container}>
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
            style={styles.input}
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
        </View>
        <TouchableHighlight
          onPress={this.onSubmit}
          style={styles.submitButton}
          underlayColor="#A0A0A0DD"
        >
          <View style={styles.submitContentContainer}>
            <Text style={styles.submitContentText}>LOG IN</Text>
            {buttonIcon}
          </View>
        </TouchableHighlight>
      </View>
    );
  }

  usernameOrEmailInputRef = (usernameOrEmailInput: ?TextInput) => {
    this.usernameOrEmailInput = usernameOrEmailInput;
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
    this.props.dispatchActionPromise(logInActionType, this.logInAction());
  }

  onUsernameOrEmailAlertAcknowledged = () => {
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

  async logInAction() {
    try {
      const result = await this.props.logIn(
        this.state.usernameOrEmailInputText,
        this.state.passwordInputText,
      );
      this.props.navigateToApp();
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

}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 37,
    paddingTop: 6,
    paddingLeft: 18,
    paddingRight: 18,
    marginLeft: 20,
    marginRight: 20,
    marginTop: 40,
    borderRadius: 6,
    backgroundColor: '#FFFFFFAA',
  },
  input: {
    paddingLeft: 35,
  },
  icon: {
    position: 'absolute',
    bottom: 8,
    left: 4,
  },
  submitButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderBottomRightRadius: 6,
  },
  submitContentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 18,
    paddingTop: 6,
    paddingRight: 18,
    paddingBottom: 6,
  },
  submitContentText: {
    fontSize: 18,
    fontFamily: 'OpenSans-Semibold',
    color: "#555",
    paddingRight: 7,
  },
  submitContentIconContainer: {
    width: 14,
    paddingBottom: 5,
  },
  loadingIndicatorContainer: {
    width: 14,
    paddingBottom: 2,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(logInActionType);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    loadingStatus: loadingStatusSelector(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ logIn }),
)(LogInPanel);
