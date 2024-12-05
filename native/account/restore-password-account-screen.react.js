// @flow

import * as React from 'react';
import { Text, TextInput, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import RegistrationTextInput from './registration/registration-text-input.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { RestoreBackupScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

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

  const areCredentialsPresent = !!username && !!password;
  const onProceed = React.useCallback(() => {
    if (areCredentialsPresent) {
      props.navigation.navigate(RestoreBackupScreenRouteName, {
        username,
        credentials: {
          type: 'password',
          password,
        },
      });
    }
  }, [areCredentialsPresent, password, props.navigation, username]);

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
            variant={areCredentialsPresent ? 'enabled' : 'disabled'}
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
