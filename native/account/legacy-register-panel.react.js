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

import { setDataLoadedActionType } from 'lib/actions/client-db-store-actions.js';
import {
  legacyKeyserverRegisterActionTypes,
  legacyKeyserverRegister,
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
  LegacyRegisterInfo,
  LegacyLogInExtraInfo,
  LegacyRegisterResult,
  LegacyLogInStartingPayload,
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
import { nativeLegacyLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import type { KeyPressEvent } from '../types/react-native.js';
import type { ViewStyle } from '../types/styles.js';
import {
  appOutOfDateAlertDetails,
  usernameReservedAlertDetails,
  usernameTakenAlertDetails,
  unknownErrorAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { type StateContainer } from '../utils/state-container.js';

type WritableLegacyRegisterState = {
  usernameInputText: string,
  passwordInputText: string,
  confirmPasswordInputText: string,
};
export type LegacyRegisterState = $ReadOnly<WritableLegacyRegisterState>;
type BaseProps = {
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityStyle: ViewStyle,
  +legacyRegisterState: StateContainer<LegacyRegisterState>,
};
type Props = {
  ...BaseProps,
  +loadingStatus: LoadingStatus,
  +legacyLogInExtraInfo: () => Promise<LegacyLogInExtraInfo>,
  +dispatch: Dispatch,
  +dispatchActionPromise: DispatchActionPromise,
  +legacyRegister: (
    registerInfo: LegacyRegisterInfo,
  ) => Promise<LegacyRegisterResult>,
  +getInitialNotificationsEncryptedMessage: () => Promise<string>,
};
type State = {
  +confirmPasswordFocused: boolean,
};
class LegacyRegisterPanel extends React.PureComponent<Props, State> {
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
      this.props.legacyRegisterState.state.confirmPasswordInputText.length > 0
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
      <Panel opacityStyle={this.props.opacityStyle} style={styles.container}>
        <View style={styles.row}>
          <SWMansionIcon
            name="user-1"
            size={22}
            color="#555"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={this.props.legacyRegisterState.state.usernameInputText}
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
            value={this.props.legacyRegisterState.state.passwordInputText}
            onChangeText={this.onChangePasswordInputText}
            onKeyPress={onPasswordKeyPress}
            placeholder="Password"
            autoCapitalize="none"
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
            value={
              this.props.legacyRegisterState.state.confirmPasswordInputText
            }
            onChangeText={this.onChangeConfirmPasswordInputText}
            placeholder="Confirm password"
            autoCapitalize="none"
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
    this.props.legacyRegisterState.setState({ usernameInputText: text });
  };

  onChangePasswordInputText = (text: string) => {
    const stateUpdate: Partial<WritableLegacyRegisterState> = {};
    stateUpdate.passwordInputText = text;
    if (this.passwordBeingAutoFilled) {
      this.passwordBeingAutoFilled = false;
      stateUpdate.confirmPasswordInputText = text;
    }
    this.props.legacyRegisterState.setState(stateUpdate);
  };

  onPasswordKeyPress = (event: KeyPressEvent) => {
    const { key } = event.nativeEvent;
    if (
      key.length > 1 &&
      key !== 'Backspace' &&
      key !== 'Enter' &&
      this.props.legacyRegisterState.state.confirmPasswordInputText.length === 0
    ) {
      this.passwordBeingAutoFilled = true;
    }
  };

  onChangeConfirmPasswordInputText = (text: string) => {
    this.props.legacyRegisterState.setState({ confirmPasswordInputText: text });
  };

  onConfirmPasswordFocus = () => {
    this.setState({ confirmPasswordFocused: true });
  };

  onSubmit = async () => {
    this.props.setActiveAlert(true);
    if (this.props.legacyRegisterState.state.passwordInputText === '') {
      Alert.alert(
        'Empty password',
        'Password cannot be empty',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (
      this.props.legacyRegisterState.state.passwordInputText !==
      this.props.legacyRegisterState.state.confirmPasswordInputText
    ) {
      Alert.alert(
        'Passwords don’t match',
        'Password fields must contain the same password',
        [{ text: 'OK', onPress: this.onPasswordAlertAcknowledged }],
        { cancelable: false },
      );
    } else if (
      this.props.legacyRegisterState.state.usernameInputText.search(
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
      const extraInfo = await this.props.legacyLogInExtraInfo();
      const initialNotificationsEncryptedMessage =
        await this.props.getInitialNotificationsEncryptedMessage();
      void this.props.dispatchActionPromise(
        legacyKeyserverRegisterActionTypes,
        this.legacyRegisterAction({
          ...extraInfo,
          initialNotificationsEncryptedMessage,
        }),
        undefined,
        ({
          calendarQuery: extraInfo.calendarQuery,
        }: LegacyLogInStartingPayload),
      );
    }
  };

  onPasswordAlertAcknowledged = () => {
    this.props.setActiveAlert(false);
    this.props.legacyRegisterState.setState(
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
    this.props.legacyRegisterState.setState(
      {
        usernameInputText: '',
      },
      () => {
        invariant(this.usernameInput, 'ref should exist');
        this.usernameInput.focus();
      },
    );
  };

  async legacyRegisterAction(
    extraInfo: LegacyLogInExtraInfo,
  ): Promise<LegacyRegisterResult> {
    try {
      const result = await this.props.legacyRegister({
        ...extraInfo,
        username: this.props.legacyRegisterState.state.usernameInputText,
        password: this.props.legacyRegisterState.state.passwordInputText,
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
        password: this.props.legacyRegisterState.state.passwordInputText,
      });
      return result;
    } catch (e) {
      if (e.message === 'username_reserved') {
        Alert.alert(
          usernameReservedAlertDetails.title,
          usernameReservedAlertDetails.message,
          [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'username_taken') {
        Alert.alert(
          usernameTakenAlertDetails.title,
          usernameTakenAlertDetails.message,
          [{ text: 'OK', onPress: this.onUsernameAlertAcknowledged }],
          { cancelable: false },
        );
      } else if (e.message === 'client_version_unsupported') {
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
    }
  }

  onOtherErrorAlertAcknowledged = () => {
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
  legacyKeyserverRegisterActionTypes,
);
const olmSessionInitializationDataLoadingStatusSelector =
  createLoadingStatusSelector(getOlmSessionInitializationDataActionTypes);

const ConnectedLegacyRegisterPanel: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedLegacyRegisterPanel(
    props: BaseProps,
  ) {
    const registerLoadingStatus = useSelector(registerLoadingStatusSelector);
    const olmSessionInitializationDataLoadingStatus = useSelector(
      olmSessionInitializationDataLoadingStatusSelector,
    );
    const loadingStatus = combineLoadingStatuses(
      registerLoadingStatus,
      olmSessionInitializationDataLoadingStatus,
    );

    const legacyLogInExtraInfo = useSelector(
      nativeLegacyLogInExtraInfoSelector,
    );

    const dispatch = useDispatch();
    const dispatchActionPromise = useDispatchActionPromise();
    const callLegacyRegister = useLegacyAshoatKeyserverCall(
      legacyKeyserverRegister,
    );
    const getInitialNotificationsEncryptedMessage =
      useInitialNotificationsEncryptedMessage(authoritativeKeyserverID);

    return (
      <LegacyRegisterPanel
        {...props}
        loadingStatus={loadingStatus}
        legacyLogInExtraInfo={legacyLogInExtraInfo}
        dispatch={dispatch}
        dispatchActionPromise={dispatchActionPromise}
        legacyRegister={callLegacyRegister}
        getInitialNotificationsEncryptedMessage={
          getInitialNotificationsEncryptedMessage
        }
      />
    );
  });

export default ConnectedLegacyRegisterPanel;
