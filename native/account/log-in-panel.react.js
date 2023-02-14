// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import { logInActionTypes, logIn } from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import {
  validEmailRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils.js';
import {
  type LogInInfo,
  type LogInExtraInfo,
  type LogInResult,
  type LogInStartingPayload,
  logInActionSources,
} from 'lib/types/account-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils.js';

import { TextInput } from './modal-components.react.js';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials.js';
import { PanelButton, Panel } from './panel-components.react.js';
import PasswordInput from './password-input.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { commCoreModule } from '../native-modules.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import type { KeyPressEvent } from '../types/react-native.js';
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
  +logInExtraInfo: () => LogInExtraInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +logIn: (logInInfo: LogInInfo) => Promise<LogInResult>,
  +primaryIdentityPublicKey: ?string,
};
class LogInPanel extends React.PureComponent<Props> {
  usernameInput: ?TextInput;
  passwordInput: ?PasswordInput;

  componentDidMount() {
    this.attemptToFetchCredentials();
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
            editable={this.props.loadingStatus !== 'loading'}
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
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.passwordInputRef}
          />
        </View>
        <View style={styles.footer}>
          <PanelButton
            text="LOG IN"
            loadingStatus={this.props.loadingStatus}
            onSubmit={this.onSubmit}
            disabled={
              this.props.primaryIdentityPublicKey === undefined ||
              this.props.primaryIdentityPublicKey === null
            }
          />
        </View>
      </Panel>
    );
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

  onSubmit: () => void = () => {
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
    const extraInfo = this.props.logInExtraInfo();
    this.props.dispatchActionPromise(
      logInActionTypes,
      this.logInAction(extraInfo),
      undefined,
      ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
    );
  };

  async logInAction(extraInfo: LogInExtraInfo): Promise<LogInResult> {
    const { primaryIdentityPublicKey } = this.props;
    try {
      invariant(
        primaryIdentityPublicKey !== null &&
          primaryIdentityPublicKey !== undefined,
        'primaryIdentityPublicKey must exist in logInAction',
      );
      const result = await this.props.logIn({
        ...extraInfo,
        username: this.usernameInputText,
        password: this.passwordInputText,
        logInActionSource: logInActionSources.logInFromNativeForm,
        primaryIdentityPublicKey: primaryIdentityPublicKey,
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
          'Incorrect username or password',
          "Either that user doesn't exist, or the password is incorrect",
          [{ text: 'OK', onPress: this.onUnsuccessfulLoginAlertAckowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'client_version_unsupported') {
        const app = Platform.select({
          ios: 'App Store',
          android: 'Play Store',
        });
        Alert.alert(
          'App out of date',
          'Your app version is pretty old, and the server doesn’t know how ' +
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

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);

const ConnectedLogInPanel: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedLogInPanel(props: BaseProps) {
    const loadingStatus = useSelector(loadingStatusSelector);

    const navContext = React.useContext(NavContext);
    const logInExtraInfo = useSelector(state =>
      nativeLogInExtraInfoSelector({
        redux: state,
        navContext,
      }),
    );

    const dispatchActionPromise = useDispatchActionPromise();
    const callLogIn = useServerCall(logIn);

    const [
      primaryIdentityPublicKey,
      setPrimaryIdentityPublicKey,
    ] = React.useState<?string>(null);
    React.useEffect(() => {
      (async () => {
        await commCoreModule.initializeCryptoAccount('PLACEHOLDER');
        const { ed25519 } = await commCoreModule.getUserPublicKey();
        setPrimaryIdentityPublicKey(ed25519);
      })();
    }, []);

    return (
      <LogInPanel
        {...props}
        loadingStatus={loadingStatus}
        logInExtraInfo={logInExtraInfo}
        dispatchActionPromise={dispatchActionPromise}
        logIn={callLogIn}
        primaryIdentityPublicKey={primaryIdentityPublicKey}
      />
    );
  },
);

export default ConnectedLogInPanel;
