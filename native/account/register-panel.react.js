// @flow

import invariant from 'invariant';
import * as React from 'react';
import {
  Text,
  View,
  StyleSheet,
  Platform,
  Keyboard,
  Linking,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import {
  keyserverRegisterActionTypes,
  keyserverRegister,
  getOlmSessionInitializationDataActionTypes,
} from 'lib/actions/user-actions.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors.js';
import { validUsernameRegex } from 'lib/shared/account-utils.js';
import { useInitialNotificationsEncryptedMessage } from 'lib/shared/crypto-utils.js';
import type {
  RegisterInfo,
  LogInExtraInfo,
  RegisterResult,
  LogInStartingPayload,
} from 'lib/types/account-types.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import {
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { TextInput } from './modal-components.react.js';
import { setNativeCredentials } from './native-credentials.js';
import { PanelButton, Panel } from './panel-components.react.js';
import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import type { KeyPressEvent } from '../types/react-native.js';
import {
  AppOutOfDateAlertDetails,
  UsernameReservedAlertDetails,
  UsernameTakenAlertDetails,
  UnknownErrorAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { type StateContainer } from '../utils/state-container.js';

type WritableRegisterState = {
  usernameInputText: string,
  passwordInputText: string,
  confirmPasswordInputText: string,
};
export type RegisterState = $ReadOnly<WritableRegisterState>;
type BaseProps = {
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityValue: Animated.Node,
  +registerState: StateContainer<RegisterState>,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +logInExtraInfo: () => Promise<LogInExtraInfo>,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +register: (registerInfo: RegisterInfo) => Promise<RegisterResult>,
  +getInitialNotificationsEncryptedMessage: () => Promise<string>,
};
type State = {
  +confirmPasswordFocused: boolean,
};
class RegisterPanel extends React.PureComponent<Props, State> {
  state: State = {
    confirmPasswordFocused: false,
  };
  usernameInput: ?TextInput;
  passwordInput: ?TextInput;
  confirmPasswordInput: ?TextInput;
  passwordBeingAutoFilled = false;

  render(): React.Node {
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

    const privatePolicyNotice = (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          By signing up, you agree to our{' '}
          <Text style={styles.hyperlinkText} onPress={this.onTermsOfUsePressed}>
            Terms
          </Text>
          {' & '}
          <Text
            style={styles.hyperlinkText}
            onPress={this.onPrivacyPolicyPressed}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    );

    return (
      <Panel opacityValue={this.props.opacityValue} style={styles.container}>
        <View style={styles.row}>
          <SWMansionIcon
            name="user-1"
            size={22}
            color="#555"
            style={styles.icon}
          />
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
            autoComplete="username-new"
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
          <TextInput
            style={styles.input}
            value={this.props.registerState.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            onKeyPress={onPasswordKeyPress}
            placeholder="Password"
            secureTextEntry={true}
            textContentType="password"
            autoComplete="password-new"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={this.focusConfirmPasswordInput}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.passwordInputRef}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={this.props.registerState.state.confirmPasswordInputText}
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            autoComplete="password-new"
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={this.onSubmit}
            onFocus={this.onConfirmPasswordFocus}
            editable={this.props.loadingStatus !== 'loading'}
            ref={this.confirmPasswordInputRef}
            {...confirmPasswordTextInputExtraProps}
          />
        </View>
        <View style={styles.footer}>
          {privatePolicyNotice}
          <PanelButton
            text="SIGN UP"
            loadingStatus={this.props.loadingStatus}
            onSubmit={this.onSubmit}
          />
        </View>
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

  onTermsOfUsePressed = () => {
    void Linking.openURL('https://comm.app/terms');
  };

  onPrivacyPolicyPressed = () => {
    void Linking.openURL('https://comm.app/privacy');
  };

  onChangeUsernameInputText = (text: string) => {
    this.props.registerState.setState({ usernameInputText: text });
  };

  onChangePasswordInputText = (text: string) => {
    const stateUpdate: Partial<WritableRegisterState> = {};
    stateUpdate.passwordInputText = text;
    if (this.passwordBeingAutoFilled) {
      this.passwordBeingAutoFilled = false;
      stateUpdate.confirmPasswordInputText = text;
    }
    this.props.registerState.setState(stateUpdate);
  };

  onPasswordKeyPress = (event: KeyPressEvent) => {
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

  onSubmit = async () => {
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
        'Passwords don’t match',
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
      const extraInfo = await this.props.logInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await this.props.getInitialNotificationsEncryptedMessage();
      void this.props.dispatchActionPromise(
        keyserverRegisterActionTypes,
        this.registerAction({
          ...extraInfo,
          initialNotificationsEncryptedMessage,
        }),
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

  async registerAction(extraInfo: LogInExtraInfo): Promise<RegisterResult> {
    try {
      const result = await this.props.register({
        ...extraInfo,
        username: this.props.registerState.state.usernameInputText,
        password: this.props.registerState.state.passwordInputText,
      });
      this.props.setActiveAlert(false);
      this.props.dispatch({
        type: setDataLoadedActionType,
        payload: {
          dataLoaded: true,
        },
      });
      await setNativeCredentials({
        username: result.currentUserInfo.username,
        password: this.props.registerState.state.passwordInputText,
      });
      return result;
    } catch (e) {
      if (e.message === 'username_reserved') {
        Alert.alert(
          UsernameReservedAlertDetails.title,
          UsernameReservedAlertDetails.message,
          [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'username_taken') {
        Alert.alert(
          UsernameTakenAlertDetails.title,
          UsernameTakenAlertDetails.message,
          [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
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
    zIndex: 2,
  },
  footer: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexShrink: 1,
    justifyContent: 'space-between',
    paddingLeft: 24,
  },
  hyperlinkText: {
    color: '#036AFF',
    fontWeight: 'bold',
  },
  icon: {
    bottom: 10,
    left: 4,
    position: 'absolute',
  },
  input: {
    paddingLeft: 35,
  },
  notice: {
    alignSelf: 'center',
    display: 'flex',
    flexShrink: 1,
    maxWidth: 190,
    paddingBottom: 18,
    paddingRight: 8,
    paddingTop: 12,
  },
  noticeText: {
    color: '#444',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  row: {
    marginHorizontal: 24,
  },
});

const registerLoadingStatusSelector = createLoadingStatusSelector(
  keyserverRegisterActionTypes,
);
const olmSessionInitializationDataLoadingStatusSelector =
  createLoadingStatusSelector(getOlmSessionInitializationDataActionTypes);

const ConnectedRegisterPanel: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedRegisterPanel(props: BaseProps) {
    const registerLoadingStatus = useSelector(registerLoadingStatusSelector);
    const olmSessionInitializationDataLoadingStatus = useSelector(
      olmSessionInitializationDataLoadingStatusSelector,
    );
    const loadingStatus = combineLoadingStatuses(
      registerLoadingStatus,
      olmSessionInitializationDataLoadingStatus,
    );

    const logInExtraInfo = useSelector(nativeLogInExtraInfoSelector);

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const callRegister = useLegacyAshoatKeyserverCall(keyserverRegister);
    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

    return (
      <RegisterPanel
        {...props}
        loadingStatus={loadingStatus}
        logInExtraInfo={logInExtraInfo}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        register={callRegister}
        getInitialNotificationsEncryptedMessage={
          getInitialNotificationsEncryptedMessage
        }
      />
    );
  });

export default ConnectedRegisterPanel;
