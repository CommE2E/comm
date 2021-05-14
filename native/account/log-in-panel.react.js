// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet, Alert, Keyboard, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/FontAwesome';

import { logInActionTypes, logIn } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import {
  oldValidUsernameRegex,
  validEmailRegex,
} from 'lib/shared/account-utils';
import type {
  LogInInfo,
  LogInExtraInfo,
  LogInResult,
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
import type { StateContainer } from '../utils/state-container';
import {
  TextInput,
  usernamePlaceholderSelector,
} from './modal-components.react';
import { setNativeCredentials } from './native-credentials';
import { PanelButton, Panel } from './panel-components.react';

export type LogInState = {|
  +usernameOrEmailInputText: string,
  +passwordInputText: string,
|};
type BaseProps = {|
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityValue: Animated.Value,
  +innerRef: (logInPanel: ?LogInPanel) => void,
  +state: StateContainer<LogInState>,
|};
type Props = {|
  ...BaseProps,
  // Redux state
  +loadingStatus: LoadingStatus,
  +logInExtraInfo: () => LogInExtraInfo,
  +usernamePlaceholder: string,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +logIn: (logInInfo: LogInInfo) => Promise<LogInResult>,
|};
class LogInPanel extends React.PureComponent<Props> {
  usernameOrEmailInput: ?TextInput;
  passwordInput: ?TextInput;

  componentDidMount() {
    this.props.innerRef(this);
  }

  componentWillUnmount() {
    this.props.innerRef(null);
  }

  render() {
    return (
      <Panel opacityValue={this.props.opacityValue}>
        <View>
          <Icon name="user" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.props.state.state.usernameOrEmailInputText}
            onChangeText={this.onChangeUsernameOrEmailInputText}
            onKeyPress={this.onUsernameOrEmailKeyPress}
            placeholder={this.props.usernamePlaceholder}
            autoFocus={Platform.OS !== 'ios'}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="ascii-capable"
            textContentType="username"
            autoCompleteType="username"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={this.focusPasswordInput}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.usernameOrEmailInputRef}
          />
        </View>
        <View>
          <Icon name="lock" size={22} color="#777" style={styles.icon} />
          <TextInput
            style={styles.input}
            value={this.props.state.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            placeholder="Password"
            secureTextEntry={true}
            textContentType="password"
            autoCompleteType="password"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.passwordInputRef}
          />
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
    if (Platform.OS === 'ios' && usernameOrEmailInput) {
      setTimeout(() => usernameOrEmailInput.focus());
    }
  };

  focusUsernameOrEmailInput = () => {
    invariant(this.usernameOrEmailInput, 'ref should be set');
    this.usernameOrEmailInput.focus();
  };

  passwordInputRef = (passwordInput: ?TextInput) => {
    this.passwordInput = passwordInput;
  };

  focusPasswordInput = () => {
    invariant(this.passwordInput, 'ref should be set');
    this.passwordInput.focus();
  };

  onChangeUsernameOrEmailInputText = (text: string) => {
    this.props.state.setState({ usernameOrEmailInputText: text });
  };

  onUsernameOrEmailKeyPress = (
    event: $ReadOnly<{ nativeEvent: $ReadOnly<{ key: string }> }>,
  ) => {
    const { key } = event.nativeEvent;
    if (
      key.length > 1 &&
      key !== 'Backspace' &&
      key !== 'Enter' &&
      this.props.state.state.passwordInputText.length === 0
    ) {
      this.focusPasswordInput();
    }
  };

  onChangePasswordInputText = (text: string) => {
    this.props.state.setState({ passwordInputText: text });
  };

  onSubmit = () => {
    this.props.setActiveAlert(true);
    if (
      this.props.state.state.usernameOrEmailInputText.search(
        oldValidUsernameRegex,
      ) === -1 &&
      this.props.state.state.usernameOrEmailInputText.search(
        validEmailRegex,
      ) === -1
    ) {
      Alert.alert(
        'Invalid username',
        'Alphanumeric usernames or emails only',
        [{ text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged }],
        { cancelable: false },
      );
      return;
    } else if (this.props.state.state.passwordInputText === '') {
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

  onUsernameOrEmailAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        usernameOrEmailInputText: '',
      },
      () => {
        invariant(this.usernameOrEmailInput, 'ref should exist');
        this.usernameOrEmailInput.focus();
      },
    );
  };

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
          'Invalid username',
          "User doesn't exist",
          [{ text: 'OK', onPress: this.onUsernameOrEmailAlertAcknowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'invalid_credentials') {
        Alert.alert(
          'Incorrect password',
          'The password you entered is incorrect',
          [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
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

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        passwordInputText: '',
      },
      () => {
        invariant(this.passwordInput, 'passwordInput ref unset');
        this.passwordInput.focus();
      },
    );
  };

  onUnknownErrorAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.state.setState(
      {
        usernameOrEmailInputText: '',
        passwordInputText: '',
      },
      () => {
        invariant(this.usernameOrEmailInput, 'ref should exist');
        this.usernameOrEmailInput.focus();
      },
    );
  };

  onAppOutOfDateAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
  };
}

export type InnerLogInPanel = LogInPanel;

const styles = StyleSheet.create({
  icon: {
    bottom: 8,
    left: 4,
    position: 'absolute',
  },
  input: {
    paddingLeft: 35,
  },
});

const loadingStatusSelector = createLoadingStatusSelector(logInActionTypes);

export default React.memo<BaseProps>(function ConnectedLogInPanel(
  props: BaseProps,
) {
  const loadingStatus = useSelector(loadingStatusSelector);
  const usernamePlaceholder = useSelector(usernamePlaceholderSelector);

  const navContext = React.useContext(NavContext);
  const logInExtraInfo = useSelector((state) =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const callLogIn = useServerCall(logIn);

  return (
    <LogInPanel
      {...props}
      loadingStatus={loadingStatus}
      logInExtraInfo={logInExtraInfo}
      usernamePlaceholder={usernamePlaceholder}
      dispatchActionPromise={dispatchActionPromise}
      logIn={callLogIn}
    />
  );
});
