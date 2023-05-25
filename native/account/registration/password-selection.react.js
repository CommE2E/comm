// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import RegistrationTextInput from './registration-text-input.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import type { NavigationRoute } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

export type PasswordSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
    +username: string,
  },
};

type PasswordError = 'passwords_dont_match' | 'empty_password';

type Props = {
  +navigation: RegistrationNavigationProp<'PasswordSelection'>,
  +route: NavigationRoute<'PasswordSelection'>,
};
// eslint-disable-next-line no-unused-vars
function PasswordSelection(props: Props): React.Node {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const passwordsMatch = password === confirmPassword;
  const passwordIsEmpty = password === '';

  const [passwordError, setPasswordError] = React.useState<?PasswordError>();
  const potentiallyClearErrors = React.useCallback(() => {
    if (!passwordsMatch || passwordIsEmpty) {
      return false;
    }
    setPasswordError(null);
    return true;
  }, [passwordsMatch, passwordIsEmpty]);

  const checkPasswordValidity = React.useCallback(() => {
    if (!passwordsMatch) {
      setPasswordError('passwords_dont_match');
      return false;
    } else if (passwordIsEmpty) {
      setPasswordError('empty_password');
      return false;
    }
    return potentiallyClearErrors();
  }, [passwordsMatch, passwordIsEmpty, potentiallyClearErrors]);

  const onProceed = React.useCallback(() => {
    if (!checkPasswordValidity()) {
      return;
    }
  }, [checkPasswordValidity]);

  const styles = useStyles(unboundStyles);
  let errorText;
  if (passwordError === 'passwords_dont_match') {
    errorText = (
      <Text style={styles.errorText}>Passwords don&rsquo;t match</Text>
    );
  } else if (passwordError === 'empty_password') {
    errorText = <Text style={styles.errorText}>Password cannot be empty</Text>;
  }

  const confirmPasswordInputRef = React.useRef();
  const focusConfirmPasswordInput = React.useCallback(() => {
    confirmPasswordInputRef.current?.focus();
  }, []);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Pick a password</Text>
        <RegistrationTextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          autoFocus={true}
          secureTextEntry={true}
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="next"
          onSubmitEditing={focusConfirmPasswordInput}
          onBlur={potentiallyClearErrors}
        />
        <RegistrationTextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          secureTextEntry={true}
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={onProceed}
          onBlur={checkPasswordValidity}
          style={styles.confirmPassword}
          ref={confirmPasswordInputRef}
        />
        <View style={styles.error}>{errorText}</View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Next"
          variant={passwordsMatch ? 'enabled' : 'disabled'}
        />
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
  error: {
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'redText',
  },
  confirmPassword: {
    marginTop: 16,
  },
};

export default PasswordSelection;
