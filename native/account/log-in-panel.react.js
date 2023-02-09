// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform } from 'react-native';
import Animated from 'react-native-reanimated';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  validEmailRegex,
  oldValidUsernameRegex,
} from 'lib/shared/account-utils';
import {
  type LogInInfo,
  type LogInExtraInfo,
  type LogInResult,
  type LogInStartingPayload,
  logInActionSources,
} from 'lib/types/account-types';
import type { LoadingStatus } from 'lib/types/loading-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import SWMansionIcon from '../components/swmansion-icon.react';
import { commCoreModule } from '../native-modules';
import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import type { KeyPressEvent } from '../types/react-native';
import type { StateContainer } from '../utils/state-container';
import { TextInput } from './modal-components.react';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials';
import { PanelButton, Panel } from './panel-components.react';
import PasswordInput from './password-input.react';

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
    try {
      const result = await this.props.logIn({
        ...extraInfo,
        username: this.usernameInputText,
        password: this.passwordInputText,
        logInActionSource: logInActionSources.logInFromNativeForm,
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
        loadingStatus={!primaryIdentityPublicKey ? 'loading' : loadingStatus}
        logInExtraInfo={logInExtraInfo}
        dispatchActionPromise={dispatchActionPromise}
        logIn={callLogIn}
        primaryIdentityPublicKey={primaryIdentityPublicKey}
      />
    );
  },
);

export default ConnectedLogInPanel;
