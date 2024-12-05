// @flow

import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: SignInNavigationProp<'RestoreBackupScreen'>,
  +route: NavigationRoute<'RestoreBackupScreen'>,
};

export type RestoreBackupScreenParams = {
  +username: string,
  +credentials:
    | {
        +type: 'password',
        +password: string,
      }
    | {
        +type: 'siwe',
        +message: string,
        +signature: string,
      },
};

// eslint-disable-next-line no-unused-vars
function RestoreBackupScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Restoring from backup</Text>
        <Text style={styles.section}>
          Your backup is currently being restored.
        </Text>
        <Text style={styles.section}>
          You will be automatically navigated to the app after this process is
          finished.
        </Text>
        <View style={styles.details}>
          <Text style={styles.section}>Backup details:</Text>
          <Text style={styles.detail}>Date:</Text>
          <Text style={styles.detail}>Size:</Text>
        </View>
        <ActivityIndicator
          color="white"
          size="large"
          style={styles.activityIndicator}
        />
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
  section: {
    fontFamily: 'Arial',
    fontSize: 15,
    lineHeight: 20,
    color: 'panelForegroundSecondaryLabel',
    paddingBottom: 16,
  },
  details: {
    borderColor: 'panelForegroundBorder',
    borderWidth: 2,
    borderRadius: 8,
    padding: 8,
    color: 'panelForegroundSecondaryLabel',
  },
  detail: {
    fontSize: 15,
    color: 'panelForegroundTertiaryLabel',
  },
  activityIndicator: {
    flexGrow: 1,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default RestoreBackupScreen;
