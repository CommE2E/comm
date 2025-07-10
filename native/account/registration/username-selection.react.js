// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';

import { validUsernameRegex } from 'lib/shared/account-utils.js';
import { isValidEthereumAddress } from 'lib/utils/siwe-utils.js';

import type { AuthNavigationProp } from './auth-navigator.react.js';
import { RegistrationContext } from './registration-context.js';
import RegistrationTextInput from './registration-text-input.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import PrimaryButton from '../../components/primary-button.react.js';
import { commRustModule } from '../../native-modules.js';
import {
  type NavigationRoute,
  PasswordSelectionRouteName,
} from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';
import AuthButtonContainer from '../auth-components/auth-button-container.react.js';
import AuthContainer from '../auth-components/auth-container.react.js';
import AuthContentContainer from '../auth-components/auth-content-container.react.js';

export type UsernameSelectionParams = {
  +userSelections: {
    +coolOrNerdMode?: ?CoolOrNerdMode,
    +keyserverURL?: ?string,
    +farcasterID: ?string,
    +farcasterAvatarURL: ?string,
    +farcasterDCsToken: ?string,
  },
};

type UsernameError = 'username_invalid' | 'username_taken';

type Props = {
  +navigation: AuthNavigationProp<'UsernameSelection'>,
  +route: NavigationRoute<'UsernameSelection'>,
};
function UsernameSelection(props: Props): React.Node {
  const registrationContext = React.useContext(RegistrationContext);
  invariant(registrationContext, 'registrationContext should be set');
  const { cachedSelections, setCachedSelections } = registrationContext;

  const [username, setUsername] = React.useState(
    cachedSelections.username ?? '',
  );
  const validUsername =
    username.search(validUsernameRegex) > -1 &&
    !isValidEthereumAddress(username.toLowerCase());

  const [usernameError, setUsernameError] = React.useState<?UsernameError>();
  const checkUsernameValidity = React.useCallback(() => {
    if (!validUsername) {
      setUsernameError('username_invalid');
      return false;
    }
    setUsernameError(null);
    return true;
  }, [validUsername]);

  const { userSelections } = props.route.params;

  const [usernameSearchLoading, setUsernameSearchLoading] =
    React.useState(false);

  const { navigate } = props.navigation;
  const onProceed = React.useCallback(async () => {
    if (!checkUsernameValidity()) {
      return;
    }

    setUsernameSearchLoading(true);

    let userAlreadyExists;
    try {
      const findUserIDResponseString =
        await commRustModule.findUserIDForUsername(username);
      const findUserIDResponse = JSON.parse(findUserIDResponseString);
      userAlreadyExists =
        !!findUserIDResponse.userID || findUserIDResponse.isReserved;
    } finally {
      setUsernameSearchLoading(false);
    }

    if (userAlreadyExists) {
      setUsernameError('username_taken');
      return;
    }

    setUsernameError(undefined);
    setCachedSelections(oldUserSelections => ({
      ...oldUserSelections,
      username,
    }));
    navigate<'PasswordSelection'>({
      name: PasswordSelectionRouteName,
      params: {
        userSelections: {
          ...userSelections,
          username,
        },
      },
    });
  }, [
    checkUsernameValidity,
    navigate,
    setCachedSelections,
    userSelections,
    username,
  ]);

  let buttonVariant = 'disabled';
  if (usernameSearchLoading) {
    buttonVariant = 'loading';
  } else if (validUsername) {
    buttonVariant = 'enabled';
  }

  const styles = useStyles(unboundStyles);
  const errorNumberStyle = React.useMemo(
    () => [styles.errorText, styles.listItemNumber],
    [styles.errorText, styles.listItemNumber],
  );
  const errorTextStyle = React.useMemo(
    () => [styles.errorText, styles.listItemContent],
    [styles.errorText, styles.listItemContent],
  );

  let errorText;
  if (usernameError === 'username_invalid') {
    errorText = (
      <>
        <Text style={styles.errorText}>Usernames must:</Text>
        <View style={styles.listItem}>
          <Text style={errorNumberStyle}>{'1. '}</Text>
          <Text style={errorTextStyle}>Be at least one character long.</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={errorNumberStyle}>{'2. '}</Text>
          <Text style={errorTextStyle}>
            Start with either a letter or a number.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={errorNumberStyle}>{'3. '}</Text>
          <Text style={errorTextStyle}>
            Contain only letters, numbers, or the characters “-” and “_”.
          </Text>
        </View>
      </>
    );
  } else if (usernameError === 'username_taken') {
    errorText = (
      <Text style={styles.errorText}>
        Username taken. Please try another one
      </Text>
    );
  }

  const shouldAutoFocus = React.useRef(!cachedSelections.username);
  return (
    <AuthContainer>
      <AuthContentContainer>
        <Text style={styles.header}>Pick a username</Text>
        <RegistrationTextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoFocus={shouldAutoFocus.current}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="ascii-capable"
          textContentType="username"
          autoComplete="username-new"
          returnKeyType="go"
          onSubmitEditing={onProceed}
          editable={!usernameSearchLoading}
          onBlur={checkUsernameValidity}
        />
        <View style={styles.error}>{errorText}</View>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onProceed}
          label="Next"
          variant={buttonVariant}
        />
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
  error: {
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'redText',
  },
  listItem: {
    flexDirection: 'row',
  },
  listItemNumber: {
    fontWeight: 'bold',
  },
  listItemContent: {
    flexShrink: 1,
  },
};

export default UsernameSelection;
