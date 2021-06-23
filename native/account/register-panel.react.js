// @flow

import invariant from 'invariant';
import React from 'react';
import { View, StyleSheet, Platform, Keyboard, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';

import { registerActionTypes, register } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import { validUsernameRegex } from 'lib/shared/account-utils';
import type {
  RegisterInfo,
  LogInExtraInfo,
  RegisterResult,
  LogInStartingPayload,
} from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { type StateContainer } from '../utils/state-container';
import { TextInput } from './modal-components.react';
import { setNativeCredentials } from './native-credentials';
import { PanelButton, Panel } from './panel-components.react';

export type RegisterState = {|
  +usernameInputText: string,
  +passwordInputText: string,
  +confirmPasswordInputText: string,
|};
type BaseProps = {|
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityValue: Animated.Value,
  +registerState: StateContainer<RegisterState>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +logInExtraInfo: () => LogInExtraInfo,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +register: (registerInfo: RegisterInfo) => Promise<RegisterResult>,
|};
type State = {|
  +confirmPasswordFocused: boolean,
|};
class RegisterPanel extends React.PureComponent<Props, State> {
  state: State = {
    confirmPasswordFocused: false,
  };
  usernameInput: ?TextInput;
  passwordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;
  passwordBeingAutoFilled = false;

  render() {
    let confirmPasswordTextInputExtraProps;
    if (
      Platform.OS !== 'ios' ||
      this.state.confirmPasswordFocused ||
      this.props.registerState.state.confirmPasswordInputText.length > 0
    ) {
      confirmPasswordTextInputExtraProps = {
        secureTextEntry: true,
        textContentType: 'password',
      };
    }

    let onPasswordKeyPress;
    if (Platform.OS === 'ios') {
      onPasswordKeyPress = this.onPasswordKeyPress;
    }

    return (
      <Panel opacityValue={this.props.opacityValue} style={styles.container}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.props.registerState.state.usernameInputText}
            onChangeText={this.onChangeUsernameInputText}
            placeholder="Username"
            autoFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            textContentType="username"
            autoCompleteType="username"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={this.focusPasswordInput}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.usernameInputRef}
          />
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.props.registerState.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            onKeyPress={onPasswordKeyPress}
            placeholder="Password"
            secureTextEntry={true}
            textContentType="password"
            autoCompleteType="password"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={this.focusConfirmPasswordInput}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.passwordInputRef}
          />
        </View>
        <View>
          <TextInput
            style={styles.input}
            value={this.props.registerState.state.confirmPasswordInputText}
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            autoCompleteType="password"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            onFocus={this.onConfirmPasswordFocus}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.confirmPasswordInputRef}
            {...confirmPasswordTextInputExtraProps}
          />
        </View>
        <PanelButton
          text="SIGN UP"
          loadingStatus={this.props.loadingStatus}
          onSubmit={this.onSubmit}
        />
      </Panel>
    );
  }

  usernameInputRef = (usernameInput: ?TextInput) => {
    this.usernameInput = usernameInput;
  };

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  };

  confirmPasswordInputRef = (confirmPasswordInput: ?TextInput) => {
    this.confirmPasswordInput = confirmPasswordInput;
  };

  focusUsernameInput = () => {
    invariant(this.usernameInput, 'ref should be set');
    this.usernameInput.focus();
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'ref should be set');
    this.passwordInput.focus();
  };

  focusConfirmPasswordInput = () => {
    invariant(this.confirmPasswordInput, 'ref should be set');
    this.confirmPasswordInput.focus();
  };

  onChangeUsernameInputText = (text: string) => {
    this.props.registerState.setState({ usernameInputText: text });
  };

  onChangePasswordInputText = (text: string) => {
    const stateUpdate = {};
    stateUpdate.passwordInputText = text;
    if (this.passwordBeingAutoFilled) {
      this.passwordBeingAutoFilled = false;
      stateUpdate.confirmPasswordInputText = text;
    }
    this.props.registerState.setState(stateUpdate);
  };

  onPasswordKeyPress = (
    event: $ReadOnly<{ nativeEvent: $ReadOnly<{ key: string }> }>,
  ) => {
    const { key } = event.nativeEvent;
    if (
      key.length > 1 &&
      key !== 'Backspace' &&
      key !== 'Enter' &&
      this.props.registerState.state.confirmPasswordInputText.length === 0
    ) {
      this.passwordBeingAutoFilled = true;
    }
  };

  onChangeConfirmPasswordInputText = (text: string) => {
    this.props.registerState.setState({ confirmPasswordInputText: text });
  };

  onConfirmPasswordFocus = () => {
    this.setState({ confirmPasswordFocused: true });
  };

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (this.props.registerState.state.passwordInputText === '') {
      Alert.alert(
        'Empty password',
        'Password cannot be empty',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (
      this.props.registerState.state.passwordInputText !==
      this.props.registerState.state.confirmPasswordInputText
    ) {
      Alert.alert(
        "Passwords don't match",
        'Password fields must contain the same password',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (
      this.props.registerState.state.usernameInputText.search(
        validUsernameRegex,
      ) === -1
    ) {
      Alert.alert(
        'Invalid username',
        'Usernames must be at least six characters long, start with either a ' +
          'letter or a number, and may contain only letters, numbers, or the ' +
          'characters “-” and “_”',
        [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
        { cancelable: false },
      );
    } else {
      Keyboard.dismiss();
      const extraInfo = this.props.logInExtraInfo();
      this.props.dispatchActionPromise(
        registerActionTypes,
        this.registerAction(extraInfo),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    }
  };

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.registerState.setState(
      {
        passwordInputText: '',
        confirmPasswordInputText: '',
      },
      () => {
        invariant(this.passwordInput, 'ref should exist');
        this.passwordInput.focus();
      },
    );
  };

  onUsernameAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.registerState.setState(
      {
        usernameInputText: '',
      },
      () => {
        invariant(this.usernameInput, 'ref should exist');
        this.usernameInput.focus();
      },
    );
  };

  async registerAction(extraInfo: LogInExtraInfo) {
    try {
      const result = await this.props.register({
        username: this.props.registerState.state.usernameInputText,
        password: this.props.registerState.state.passwordInputText,
        ...extraInfo,
      });
      this.props.setActiveAlert(false);
      await setNativeCredentials({
        username: result.currentUserInfo.username,
        password: this.props.registerState.state.passwordInputText,
      });
      return result;
    } catch (e) {
      if (e.message === 'username_taken') {
        Alert.alert(
          'Username taken',
          'An account with that username already exists',
          [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'client_version_unsupported') {
        const app = Platform.select({
          ios: 'Testflight',
          android: 'Play Store',
        });
        Alert.alert(
          'App out of date',
          "Your app version is pretty old, and the server doesn't know how " +
            `to speak to it anymore. Please use the ${app} app to update!`,
          [{ text: 'OK', onPress: this.onAppOutOfDateAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

  onUnknownErrorAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.registerState.setState(
      {
        usernameInputText: '',
        passwordInputText: '',
        confirmPasswordInputText: '',
      },
      () => {
        invariant(this.usernameInput, 'ref should exist');
        this.usernameInput.focus();
      },
    );
  };

  onAppOutOfDateAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
  };
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Platform.OS === 'ios' ? 37 : 36,
    zIndex: 2,
  },
  icon: {
    bottom: 8,
    left: 4,
    position: 'absolute',
  },
  input: {
    paddingLeft: 35,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(registerActionTypes);

export default React.memo<BaseProps>(function ConnectedRegisterPanel(
  props: BaseProps,
) {
  const loadingStatus = useSelector(loadingStatusSelector);

  const navContext = React.useContext(NavContext);
  const logInExtraInfo = useSelector((state) =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callRegister = useServerCall(register);

  return (
    <RegisterPanel
      {...props}
      loadingStatus={loadingStatus}
      logInExtraInfo={logInExtraInfo}
      dispatchActionPromise={dispatchActionPromise}
      register={callRegister}
    />
  );
});
