// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import {
  exactSearchUser,
  exactSearchUserActionTypes,
} from 'lib/actions/user-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { validUsernameRegex } from 'lib/shared/account-utils.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import RegistrationButtonContainer from './registration-button-container.react.js';
import RegistrationButton from './registration-button.react.js';
import RegistrationContainer from './registration-container.react.js';
import RegistrationContentContainer from './registration-content-container.react.js';
import type { RegistrationNavigationProp } from './registration-navigator.react.js';
import RegistrationTextInput from './registration-text-input.react.js';
import type { CoolOrNerdMode } from './registration-types.js';
import {
  type NavigationRoute,
  PasswordSelectionRouteName,
} from '../../navigation/route-names.js';
import { useSelector } from '../../redux/redux-utils.js';
import { useStyles } from '../../themes/colors.js';

const exactSearchUserLoadingStatusSelector = createLoadingStatusSelector(
  exactSearchUserActionTypes,
);

export type UsernameSelectionParams = {
  +userSelections: {
    +coolOrNerdMode: CoolOrNerdMode,
    +keyserverUsername: string,
  },
};

type UsernameError = 'username_invalid' | 'username_taken';

type Props = {
  +navigation: RegistrationNavigationProp<'UsernameSelection'>,
  +route: NavigationRoute<'UsernameSelection'>,
};
function UsernameSelection(props: Props): React.Node {
  const [username, setUsername] = React.useState('');
  const validUsername = username.search(validUsernameRegex) > -1;

  const [usernameError, setUsernameError] = React.useState<?UsernameError>();
  const checkUsernameValidity = React.useCallback(() => {
    if (!validUsername) {
      setUsernameError('username_invalid');
      return false;
    }
    setUsernameError(null);
    return true;
  }, [validUsername]);

  const exactSearchUserCall = useServerCall(exactSearchUser);
  const dispatchActionPromise = useDispatchActionPromise();
  const { navigate } = props.navigation;
  const { userSelections } = props.route.params;
  const onProceed = React.useCallback(async () => {
    if (!checkUsernameValidity()) {
      return;
    }

    const searchPromise = exactSearchUserCall(username);
    dispatchActionPromise(exactSearchUserActionTypes, searchPromise);
    const { userInfo } = await searchPromise;

    if (userInfo) {
      setUsernameError('username_taken');
      return;
    }

    setUsernameError(undefined);
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
    username,
    exactSearchUserCall,
    dispatchActionPromise,
    navigate,
    userSelections,
  ]);

  const exactSearchUserCallLoading = useSelector(
    state => exactSearchUserLoadingStatusSelector(state) === 'loading',
  );
  let buttonVariant = 'disabled';
  if (exactSearchUserCallLoading) {
    buttonVariant = 'loading';
  } else if (validUsername) {
    buttonVariant = 'enabled';
  }

  const styles = useStyles(unboundStyles);
  let errorText;
  if (usernameError === 'username_invalid') {
    errorText = (
      <>
        <Text style={styles.errorText}>Usernames must:</Text>
        <View style={styles.listItem}>
          <Text style={[styles.errorText, styles.listItemNumber]}>{'1. '}</Text>
          <Text style={[styles.errorText, styles.listItemContent]}>
            Be at least one character long.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={[styles.errorText, styles.listItemNumber]}>{'2. '}</Text>
          <Text style={[styles.errorText, styles.listItemContent]}>
            Start with either a letter or a number.
          </Text>
        </View>
        <View style={styles.listItem}>
          <Text style={[styles.errorText, styles.listItemNumber]}>{'3. '}</Text>
          <Text style={[styles.errorText, styles.listItemContent]}>
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

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Pick a username</Text>
        <RegistrationTextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          autoFocus={true}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="ascii-capable"
          textContentType="username"
          autoComplete="username-new"
          returnKeyType="go"
          onSubmitEditing={onProceed}
          editable={!exactSearchUserCallLoading}
          onBlur={checkUsernameValidity}
        />
        <View style={styles.error}>{errorText}</View>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <RegistrationButton
          onPress={onProceed}
          label="Next"
          variant={buttonVariant}
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
