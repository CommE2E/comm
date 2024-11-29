// @flow

import MaterialIcon from '@expo/vector-icons/MaterialCommunityIcons.js';
import * as React from 'react';
import { Text, View } from 'react-native';

import PromptButton from './prompt-button.react.js';
import RegistrationButtonContainer from './registration/registration-button-container.react.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react';
import type { NavigationRoute } from '../navigation/route-names';
import { RestorePasswordAccountScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: SignInNavigationProp<'RestorePromptScreen'>,
  +route: NavigationRoute<'RestorePromptScreen'>,
};

function RestorePromptScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const openPasswordRestoreScreen = React.useCallback(() => {
    props.navigation.navigate(RestorePasswordAccountScreenRouteName);
  }, [props.navigation]);

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
          <MaterialIcon name="backup-restore" size={200} color="white" />
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
            onPress={openPasswordRestoreScreen}
            variant="enabled"
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
