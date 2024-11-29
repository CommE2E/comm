// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { LogInState } from './log-in-panel.react';
import LogInPanel from './log-in-panel.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePasswordAccountScreen'>,
  +route: NavigationRoute<'RestorePasswordAccountScreen'>,
};

const initialLogInState = {
  usernameInputText: null,
  passwordInputText: null,
};

// eslint-disable-next-line no-unused-vars
function RestorePasswordAccountScreen(props: Props): React.Node {
  const [logInState, setLogInState] =
    React.useState<LogInState>(initialLogInState);
  const logInStateContainer = React.useMemo(
    () => ({
      state: logInState,
      setState: setLogInState,
    }),
    [logInState, setLogInState],
  );

  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Restore with password</Text>
        <LogInPanel logInState={logInStateContainer} />
      </RegistrationContentContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
};

export default RestorePasswordAccountScreen;
