// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePromptScreen'>,
  +route: NavigationRoute<'RestorePromptScreen'>,
};

// eslint-disable-next-line no-unused-vars
function RestorePromptScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer>
        <Text style={styles.header}>Restore account</Text>
        <Text style={styles.body}>
          Restoring an account allows you to keep using Comm after losing access
          to your primary device. In order to restore, you should choose the
          same login method that was used during registration. This operation
          will log you out from all your other devices.
        </Text>
      </RegistrationContentContainer>
      <RegistrationButtonContainer>
        <View style={styles.buttonContainer}>
          <PromptButton
            text="Restore with Ethereum"
            onPress={() => {}}
            variant="siwe"
          />
        </View>
        <View style={styles.buttonContainer}>
          <PromptButton
            text="Restore with password"
            onPress={() => {}}
            variant="regular"
          />
        </View>
      </RegistrationButtonContainer>
    </RegistrationContainer>
  );
}

const unboundStyles = {
  container: {
    backgroundColor: 'panelBackground',
    justifyContent: 'space-between',
  },
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
};

export default RestorePromptScreen;
