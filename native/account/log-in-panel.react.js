// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet, Keyboard, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  legacyLogInActionTypes,
  useLegacyLogIn,
  getOlmSessionInitializationDataActionTypes,
} from 'lib/actions/user-actions.js';
import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors.js';
import {
  validEmailRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import {
  type LogInInfo,
  type LogInExtraInfo,
  type LogInResult,
  type LogInStartingPayload,
  logInActionSources,
} from 'lib/types/account-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { TextInput } from './modal-components.react.js';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials.js';
import { PanelButton, Panel } from './panel-components.react.js';
import PasswordInput from './password-input.react.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import type { KeyPressEvent } from '../types/react-native.js';
import {
  AppOutOfDateAlertDetails,
  UnknownErrorAlertDetails,
  UserNotFoundAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import type { StateContainer } from '../utils/state-container.js';

export type LogInState = {
  +usernameInputText: ?string,
  +passwordInputText: ?string,
};
type BaseProps = {
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityValue: Animated.Node,
  +logInState: StateContainer<LogInState>,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +logInExtraInfo: () => Promise<LogInExtraInfo>,
  +dispatchActionPromise: DispatchActionPromise,
  +legacyLogIn: (logInInfo: LogInInfo) => Promise<LogInResult>,
  +identityPasswordLogIn: (username: string, password: string) => Promise<void>,
  +getInitialNotificationsEncryptedMessage: () => Promise<string>,
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
      <Panel opacityValue={this.props.opacityValue}>
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
    if (usingCommServicesAccessToken) {
      await this.identityPasswordLogIn();
      return;
    }

    const extraInfo = await this.props.logInExtraInfo();
    const initialNotificationsEncryptedMessage =
      await this.props.getInitialNotificationsEncryptedMessage();

    void this.props.dispatchActionPromise(
      legacyLogInActionTypes,
      this.legacyLogInAction({
        ...extraInfo,
        initialNotificationsEncryptedMessage,
      }),
      undefined,
      ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
    );
  };

  async legacyLogInAction(extraInfo: LogInExtraInfo): Promise<LogInResult> {
    try {
      const result = await this.props.legacyLogIn({
        ...extraInfo,
        username: this.usernameInputText,
        password: this.passwordInputText,
        authActionSource: logInActionSources.logInFromNativeForm,
      });
      this.props.setActiveAlert(false);
      await setNativeCredentials({
        username: result.currentUserInfo.username,
        password: this.passwordInputText,
      });
      return result;
    } catch (e) {
      if (e.message === 'invalid_credentials') {
        Alert.alert(
          UserNotFoundAlertDetails.title,
          UserNotFoundAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnsuccessfulLoginAlertAckowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'client_version_unsupported') {
        Alert.alert(
          AppOutOfDateAlertDetails.title,
          AppOutOfDateAlertDetails.message,
          [{ text: 'OK', onPress: this.onAppOutOfDateAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
          { cancelable: false },
        );
      }
      throw e;
    }
  }

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
        messageForException === 'user not found' ||
        messageForException === 'login failed'
      ) {
        Alert.alert(
          UserNotFoundAlertDetails.title,
          UserNotFoundAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnsuccessfulLoginAlertAckowledged }],
          { cancelable: false },
        );
      } else if (messageForException === 'Unsupported version') {
        Alert.alert(
          AppOutOfDateAlertDetails.title,
          AppOutOfDateAlertDetails.message,
          [{ text: 'OK', onPress: this.onAppOutOfDateAlertAcknowledged }],
          { cancelable: false },
        );
      } else {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: this.onUnknownErrorAlertAcknowledged }],
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

  onUnknownErrorAlertAcknowledged: () => void = () => {
    this.props.setActiveAlert(false);
    this.props.logInState.setState(
      {
        usernameInputText: '',
        passwordInputText: '',
      },
      this.focusUsernameInput,
    );
  };

  onAppOutOfDateAlertAcknowledged: () => void = () => {
    this.props.setActiveAlert(false);
  };
}

export type InnerLogInPanel = LogInPanel;

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

const logInLoadingStatusSelector = createLoadingStatusSelector(
  legacyLogInActionTypes,
);
const olmSessionInitializationDataLoadingStatusSelector =
  createLoadingStatusSelector(getOlmSessionInitializationDataActionTypes);

const ConnectedLogInPanel: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLogInPanel(props: BaseProps) {
    const logInLoadingStatus = useSelector(logInLoadingStatusSelector);
    const olmSessionInitializationDataLoadingStatus = useSelector(
      olmSessionInitializationDataLoadingStatusSelector,
    );
    const loadingStatus = combineLoadingStatuses(
      logInLoadingStatus,
      olmSessionInitializationDataLoadingStatus,
    );

    const logInExtraInfo = useSelector(nativeLogInExtraInfoSelector);

    const dispatchActionPromise = useDispatchActionPromise();
    const callLegacyLogIn = useLegacyLogIn();
    const callIdentityPasswordLogIn = usePasswordLogIn();
    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

    return (
      <LogInPanel
        {...props}
        loadingStatus={loadingStatus}
        logInExtraInfo={logInExtraInfo}
        dispatchActionPromise={dispatchActionPromise}
        legacyLogIn={callLegacyLogIn}
        identityPasswordLogIn={callIdentityPasswordLogIn}
        getInitialNotificationsEncryptedMessage={
          getInitialNotificationsEncryptedMessage
        }
      />
    );
  });

export default ConnectedLogInPanel;
