// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';

import sleep from 'lib/utils/sleep.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import { RegistrationContext } from './registration-context.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import RegistrationTextInput from './registration-text-input.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import {
  type NavigationRoute,
  AvatarSelectionRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import type { KeyPressEvent } from '../../types/react-native.js';

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
function PasswordSelection(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const [password, setPassword] = React.useState(
    cachedSelections.password ?? '',
  );
  const [confirmPassword, setConfirmPassword] = React.useState(
    cachedSelections.password ?? '',
  );
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

  const { userSelections } = props.route.params;
  const { navigate } = props.navigation;
  const onProceed = React.useCallback(() => {
    if (!checkPasswordValidity()) {
      return;
    }

    const { coolOrNerdMode, keyserverUsername, username } = userSelections;
    const newUserSelections = {
      coolOrNerdMode,
      keyserverUsername,
      accountSelection: {
        accountType: 'username',
        username,
        password,
      },
    };
    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      password,
    }));
    navigate<'AvatarSelection'>({
      name: AvatarSelectionRouteName,
      params: { userSelections: newUserSelections },
    });
  }, [
    checkPasswordValidity,
    userSelections,
    password,
    setCachedSelections,
    navigate,
  ]);

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

  const iosPasswordBeingAutoFilled = React.useRef(false);
  const confirmPasswordEmpty = confirmPassword.length === 0;
  const onPasswordKeyPress = React.useCallback(
    (event: KeyPressEvent) => {
      const { key } = event.nativeEvent;
      // On iOS, paste doesn't trigger onKeyPress, but password autofill does
      // Password autofill calls onKeyPress with `key` set to the whole password
      if (
        key.length > 1 &&
        key !== 'Backspace' &&
        key !== 'Enter' &&
        confirmPasswordEmpty
      ) {
        iosPasswordBeingAutoFilled.current = true;
      }
    },
    [confirmPasswordEmpty],
  );

  const passwordInputRef = React.useRef();
  const passwordLength = password.length;
  const onChangePasswordInput = React.useCallback(
    (input: string) => {
      setPassword(input);
      if (iosPasswordBeingAutoFilled.current) {
        // On iOS, paste doesn't trigger onKeyPress, but password autofill does
        iosPasswordBeingAutoFilled.current = false;
        setConfirmPassword(input);
        passwordInputRef.current?.blur();
      } else if (
        Platform.OS === 'android' &&
        input.length - passwordLength > 1 &&
        confirmPasswordEmpty
      ) {
        // On Android, password autofill doesn't trigger onKeyPress. Instead we
        // rely on observing when the password field changes by more than one
        // character at a time. This means we treat paste the same way as
        // password autofill
        setConfirmPassword(input);
        passwordInputRef.current?.blur();
      }
    },
    [passwordLength, confirmPasswordEmpty],
  );

  const shouldAutoFocus = React.useRef(!cachedSelections.password);

  /* eslint-disable react-hooks/rules-of-hooks */
  if (Platform.OS === 'android') {
    // It's okay to call this hook conditionally because
    // the condition is guaranteed to never change
    React.useEffect(() => {
      (async () => {
        await sleep(250);
        if (shouldAutoFocus.current) {
          passwordInputRef.current?.focus();
        }
      })();
    }, []);
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  const autoFocus = Platform.OS !== 'android' && shouldAutoFocus.current;

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Pick a password</Text>
        <RegistrationTextInput
          value={password}
          onChangeText={onChangePasswordInput}
          placeholder="Password"
          autoFocus={autoFocus}
          secureTextEntry={true}
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="next"
          onSubmitEditing={focusConfirmPasswordInput}
          onKeyPress={onPasswordKeyPress}
          onBlur={potentiallyClearErrors}
          ref={passwordInputRef}
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
          variant={passwordsMatch && !passwordIsEmpty ? 'enabled' : 'disabled'}
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
