// @flow

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';

import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
import { getMessageForException } from 'lib/utils/errors.js';

import AuthButtonContainer from './auth-components/auth-button-container.react.js';
import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import {
  fetchNativeCredentials,
  setNativeCredentials,
} from './native-credentials.js';
import type { UserCredentials } from './native-credentials.js';
import PromptButton from './prompt-button.react.js';
import RegistrationTextInput from './registration/registration-text-input.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import { useClientBackup } from '../backup/use-client-backup.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestoreBackupScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
  userNotFoundAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePasswordAccountScreen'>,
  +route: NavigationRoute<'RestorePasswordAccountScreen'>,
};

function RestorePasswordAccountScreen(props: Props): React.Node {
  const [credentials, setCredentials] = React.useState<UserCredentials>({
    username: '',
    password: '',
  });
  const setUsername = React.useCallback(
    (username: string) =>
      setCredentials(prevCredentials => ({
        ...prevCredentials,
        username,
      })),
    [],
  );
  const setPassword = React.useCallback(
    (password: string) =>
      setCredentials(prevCredentials => ({
        ...prevCredentials,
        password,
      })),
    [],
  );

  React.useEffect(() => {
    void (async () => {
      const nativeCredentials = await fetchNativeCredentials();
      if (!nativeCredentials) {
        return;
      }
      setCredentials(prevCredentials => {
        if (!prevCredentials.username && !prevCredentials.password) {
          return nativeCredentials;
        }
        return prevCredentials;
      });
    })();
  }, []);

  const passwordInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();
  const focusPasswordInput = React.useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

  const usernameInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();
  const focusUsernameInput = React.useCallback(() => {
    usernameInputRef.current?.focus();
  }, []);

  const onUnsuccessfulLoginAlertAcknowledged = React.useCallback(() => {
    setCredentials({ username: '', password: '' });
    focusUsernameInput();
  }, [focusUsernameInput]);

  const identityPasswordLogIn = usePasswordLogIn();
  const { retrieveLatestBackupInfo } = useClientBackup();
  const areCredentialsPresent =
    !!credentials.username && !!credentials.password;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const onProceed = React.useCallback(async () => {
    if (!areCredentialsPresent) {
      return;
    }
    setIsProcessing(true);
    try {
      const latestBackupInfo = await retrieveLatestBackupInfo(
        credentials.username,
      );
      if (!latestBackupInfo) {
        await identityPasswordLogIn(credentials.username, credentials.password);
        await setNativeCredentials(credentials);
        return;
      }
      props.navigation.navigate(RestoreBackupScreenRouteName, {
        userIdentifier: credentials.username,
        credentials: {
          type: 'password',
          password: credentials.password,
        },
      });
    } catch (e) {
      const messageForException = getMessageForException(e);
      let alertMessage = unknownErrorAlertDetails;
      let onPress = null;
      if (
        messageForException === 'user_not_found' ||
        messageForException === 'login_failed'
      ) {
        alertMessage = userNotFoundAlertDetails;
        onPress = onUnsuccessfulLoginAlertAcknowledged;
      } else if (
        messageForException === 'unsupported_version' ||
        messageForException === 'client_version_unsupported' ||
        messageForException === 'use_new_flow'
      ) {
        alertMessage = appOutOfDateAlertDetails;
      }
      Alert.alert(
        alertMessage.title,
        alertMessage.message,
        [{ text: 'OK', onPress }],
        { cancelable: false },
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    areCredentialsPresent,
    credentials,
    identityPasswordLogIn,
    onUnsuccessfulLoginAlertAcknowledged,
    props.navigation,
    retrieveLatestBackupInfo,
  ]);

  let restoreButtonVariant = 'loading';
  if (!isProcessing) {
    restoreButtonVariant = areCredentialsPresent ? 'enabled' : 'disabled';
  }

  const styles = useStyles(unboundStyles);
  return (
    <AuthContainer>
      <AuthContentContainer>
        <Text style={styles.header}>Restore with password</Text>
        <RegistrationTextInput
          value={credentials.username}
          onChangeText={setUsername}
          placeholder="Username"
          autoFocus={true}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="ascii-capable"
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
          onSubmitEditing={focusPasswordInput}
          ref={usernameInputRef}
        />
        <RegistrationTextInput
          value={credentials.password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry={true}
          textContentType="password"
          autoComplete="password"
          autoCapitalize="none"
          returnKeyType="go"
          onSubmitEditing={onProceed}
          style={styles.password}
          ref={passwordInputRef}
        />
      </AuthContentContainer>
      <AuthButtonContainer>
        <View style={styles.buttonContainer}>
          <PromptButton
            text="Restore"
            onPress={onProceed}
            variant={restoreButtonVariant}
          />
        </View>
      </AuthButtonContainer>
    </AuthContainer>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  password: {
    marginTop: 16,
  },
};

export default RestorePasswordAccountScreen;
