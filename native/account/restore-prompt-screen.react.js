// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { useColors, useStyles } from '../themes/colors.js';
import RestoreIcon from '../vectors/restore-icon.react.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePromptScreen'>,
  +route: NavigationRoute<'RestorePromptScreen'>,
};

// eslint-disable-next-line no-unused-vars
function RestorePromptScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const colors = useColors();
  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Restore account</Text>
        <Text style={styles.section}>
          If you’ve lost access to your primary device, you can try recovering
          your Comm account.
        </Text>
        <Text style={styles.section}>
          To proceed, select the same login method that you used during
          registration.
        </Text>
        <Text style={styles.section}>
          Note that after completing the recovery flow, you will be logged out
          from all of your other devices.
        </Text>
        <View style={styles.iconContainer}>
          <RestoreIcon color={colors.panelForegroundIcon} />
        </View>
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
  header: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 16,
  },
  section: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  iconContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default RestorePromptScreen;
