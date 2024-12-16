// @flow

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';

import { usePasswordLogIn } from 'lib/hooks/login-hooks.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { setNativeCredentials } from './native-credentials.js';
import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
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
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const passwordInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();
  const focusPasswordInput = React.useCallback(() => {
    passwordInputRef.current?.focus();
  }, []);

  const usernameInputRef = React.useRef<?React.ElementRef<typeof TextInput>>();
  const focusUsernameInput = React.useCallback(() => {
    usernameInputRef.current?.focus();
  }, []);

  const onUnsuccessfulLoginAlertAcknowledged = React.useCallback(() => {
    setUsername('');
    setPassword('');
    focusUsernameInput();
  }, [focusUsernameInput]);

  const identityPasswordLogIn = usePasswordLogIn();
  const { retrieveLatestBackupInfo } = useClientBackup();
  const areCredentialsPresent = !!username && !!password;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const onProceed = React.useCallback(async () => {
    if (!areCredentialsPresent) {
      return;
    }
    setIsProcessing(true);
    try {
      const latestBackupInfo = await retrieveLatestBackupInfo(username);
      if (!latestBackupInfo) {
        await identityPasswordLogIn(username, password);
        await setNativeCredentials({
          username,
          password,
        });
        return;
      }
      props.navigation.navigate(RestoreBackupScreenRouteName, {
        userIdentifier: username,
        credentials: {
          type: 'password',
          password,
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
    identityPasswordLogIn,
    onUnsuccessfulLoginAlertAcknowledged,
    password,
    props.navigation,
    retrieveLatestBackupInfo,
    username,
  ]);

  let restoreButtonVariant = 'loading';
  if (!isProcessing) {
    restoreButtonVariant = areCredentialsPresent ? 'enabled' : 'disabled';
  }

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Restore with password</Text>
        <RegistrationTextInput
          value={username}
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
          value={password}
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
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <View style={styles.buttonContainer}>
          <PromptButton
            text="Restore"
            onPress={onProceed}
            variant={restoreButtonVariant}
          />
        </View>
      </RegistrationButtonContainer>
    </RegistrationContainer>
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
