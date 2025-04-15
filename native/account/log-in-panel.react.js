// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';

import { getOlmSessionInitializationDataActionTypes } from 'lib/actions/user-actions.js';
import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  oldValidUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils.js';
import type { IdentityAuthResult } from 'lib/types/identity-service-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { TextInput } from './modal-components.react.js';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials.js';
import { Panel, PanelButton } from './panel-components.react.js';
import PasswordInput from './password-input.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { KeyPressEvent } from '../types/react-native.js';
import type { ViewStyle } from '../types/styles.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
  userNotFoundAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import type { StateContainer } from '../utils/state-container.js';

export type LogInState = {
  +usernameInputText: ?string,
  +passwordInputText: ?string,
};
type BaseProps = {
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityStyle: ViewStyle,
  +logInState: StateContainer<LogInState>,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +identityPasswordLogIn: (
    username: string,
    password: string,
  ) => Promise<IdentityAuthResult>,
};
type State = {
  +logInPending: boolean,
};
class LogInPanel extends React.PureComponent<Props, State> {
  usernameInput: ?TextInput;
  passwordInput: ?PasswordInput;
  state: State = { logInPending: false };

  componentDidMount() {
    void this.attemptToFetchCredentials();
  }

  get usernameInputText(): string {
    return this.props.logInState.state.usernameInputText || '';
  }

  get passwordInputText(): string {
    return this.props.logInState.state.passwordInputText || '';
  }

  async attemptToFetchCredentials() {
    if (
      this.props.logInState.state.usernameInputText !== null &&
      this.props.logInState.state.usernameInputText !== undefined
    ) {
      return;
    }
    const credentials = await fetchNativeCredentials();
    if (!credentials) {
      return;
    }
    if (
      this.props.logInState.state.usernameInputText !== null &&
      this.props.logInState.state.usernameInputText !== undefined
    ) {
      return;
    }
    this.props.logInState.setState({
      usernameInputText: credentials.username,
      passwordInputText: credentials.password,
    });
  }

  render(): React.Node {
    return (
      <Panel opacityStyle={this.props.opacityStyle}>
        <View style={styles.row}>
          <SWMansionIcon
            name="user-1"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={this.usernameInputText}
            onChangeText={this.onChangeUsernameInputText}
            onKeyPress={this.onUsernameKeyPress}
            placeholder="Username"
            autoFocus={Platform.OS !== 'ios'}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={this.focusPasswordInput}
            editable={this.getLoadingStatus() !== 'loading'}
            ref={this.usernameInputRef}
          />
        </View>
        <View style={styles.row}>
          <SWMansionIcon
            name="lock-on"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <PasswordInput
            style={styles.input}
            value={this.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="Password"
            textContentType="password"
            autoComplete="password"
            autoCapitalize="none"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.getLoadingStatus() !== 'loading'}
            ref={this.passwordInputRef}
          />
        </View>
        <View style={styles.footer}>
          <PanelButton
            text="LOG IN"
            loadingStatus={this.getLoadingStatus()}
            onSubmit={this.onSubmit}
          />
        </View>
      </Panel>
    );
  }

  getLoadingStatus(): LoadingStatus {
    if (this.props.loadingStatus === 'loading') {
      return 'loading';
    }
    if (this.state.logInPending) {
      return 'loading';
    }
    return 'inactive';
  }

  usernameInputRef: (usernameInput: ?TextInput) => void = usernameInput => {
    this.usernameInput = usernameInput;
    if (Platform.OS === 'ios' && usernameInput) {
      setTimeout(() => usernameInput.focus());
    }
  };

  focusUsernameInput: () => void = () => {
    invariant(this.usernameInput, 'ref should be set');
    this.usernameInput.focus();
  };

  passwordInputRef: (passwordInput: ?PasswordInput) => void = passwordInput => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput: () => void = () => {
    invariant(this.passwordInput, 'ref should be set');
    this.passwordInput.focus();
  };

  onChangeUsernameInputText: (text: string) => void = text => {
    this.props.logInState.setState({ usernameInputText: text.trim() });
  };

  onUsernameKeyPress: (event: KeyPressEvent) => void = event => {
    const { key } = event.nativeEvent;
    if (
      key.length > 1 &&
      key !== 'Backspace' &&
      key !== 'Enter' &&
      this.passwordInputText.length === 0
    ) {
      this.focusPasswordInput();
    }
  };

  onChangePasswordInputText: (text: string) => void = text => {
    this.props.logInState.setState({ passwordInputText: text });
  };

  onSubmit: () => Promise<void> = async () => {
    this.props.setActiveAlert(true);
    if (this.usernameInputText.search(validEmailRegex) > -1) {
      Alert.alert(
        'Can’t log in with email',
        'You need to log in with your username now',
        [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
        { cancelable: false },
      );
      return;
    } else if (this.usernameInputText.search(oldValidUsernameRegex) === -1) {
      Alert.alert(
        'Invalid username',
        'Alphanumeric usernames only',
        [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
        { cancelable: false },
      );
      return;
    } else if (this.passwordInputText === '') {
      Alert.alert(
        'Empty password',
        'Password cannot be empty',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
      return;
    }

    Keyboard.dismiss();
    await this.identityPasswordLogIn();
  };

  async identityPasswordLogIn(): Promise<void> {
    if (this.state.logInPending) {
      return;
    }
    this.setState({ logInPending: true });
    try {
      await this.props.identityPasswordLogIn(
        this.usernameInputText,
        this.passwordInputText,
      );
      this.props.setActiveAlert(false);
      await setNativeCredentials({
        username: this.usernameInputText,
        password: this.passwordInputText,
      });
    } catch (e) {
      const messageForException = getMessageForException(e);
      if (
        messageForException === 'user_not_found' ||
        messageForException === 'login_failed'
      ) {
        Alert.alert(
          userNotFoundAlertDetails.title,
          userNotFoundAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnsuccessfulLoginAlertAckowledged }],
          { cancelable: false },
        );
      } else if (
        messageForException === 'unsupported_version' ||
        messageForException === 'client_version_unsupported' ||
        messageForException === 'use_new_flow'
      ) {
        Alert.alert(
          appOutOfDateAlertDetails.title,
          appOutOfDateAlertDetails.message,
          [{ text: 'OK', onPress: this.onOtherErrorAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: this.onOtherErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
      throw e;
    } finally {
      this.setState({ logInPending: false });
    }
  }

  onUnsuccessfulLoginAlertAckowledged: () => void = () => {
    this.props.setActiveAlert(false);
    this.props.logInState.setState(
      {
        usernameInputText: '',
        passwordInputText: '',
      },
      this.focusUsernameInput,
    );
  };

  onUsernameAlertAcknowledged: () => void = () => {
    this.props.setActiveAlert(false);
    this.props.logInState.setState(
      {
        usernameInputText: '',
      },
      this.focusUsernameInput,
    );
  };

  onPasswordAlertAcknowledged: () => void = () => {
    this.props.setActiveAlert(false);
    this.props.logInState.setState(
      {
        passwordInputText: '',
      },
      this.focusPasswordInput,
    );
  };

  onOtherErrorAlertAcknowledged: () => void = () => {
    this.props.setActiveAlert(false);
  };
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  icon: {
    bottom: 10,
    left: 4,
    position: 'absolute',
  },
  input: {
    paddingLeft: 35,
  },
  row: {
    marginHorizontal: 24,
  },
});

const olmSessionInitializationDataLoadingStatusSelector =
  createLoadingStatusSelector(getOlmSessionInitializationDataActionTypes);

const ConnectedLogInPanel: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLogInPanel(props: BaseProps) {
    const loadingStatus = useSelector(
      olmSessionInitializationDataLoadingStatusSelector,
    );

    const callIdentityPasswordLogIn = usePasswordLogIn();

    return (
      <LogInPanel
        {...props}
        loadingStatus={loadingStatus}
        identityPasswordLogIn={callIdentityPasswordLogIn}
      />
    );
  });

export default ConnectedLogInPanel;
