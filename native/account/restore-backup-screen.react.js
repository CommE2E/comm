// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

import type { SignedMessage } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import { setNativeCredentials } from './native-credentials.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import { useRestore } from './restore.js';
import { commCoreModule } from '../native-modules.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
  userNotFoundAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type Props = {
  +navigation: AuthNavigationProp<'RestoreBackupScreen'>,
  +route: NavigationRoute<'RestoreBackupScreen'>,
};

export type RestoreBackupScreenParams = {
  +userIdentifier: string,
  +credentials:
    | {
        +type: 'password',
        +password: string,
      }
    | {
        +type: 'siwe',
        +socialProof: SignedMessage,
        +backup: SignedMessage,
      },
};

function RestoreBackupScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { userIdentifier, credentials } = props.route.params;

  const restore = useRestore();
  React.useEffect(() => {
    void (async () => {
      try {
        if (credentials.type === 'password') {
          await restore(userIdentifier, credentials.password);
          await setNativeCredentials({
            username: userIdentifier,
            password: credentials.password,
          });
        } else {
          await restore(
            userIdentifier,
            credentials.backup.signature,
            credentials.socialProof,
          );
          await commCoreModule.setSIWEBackupSecrets(credentials.backup);
        }
      } catch (e) {
        const messageForException = getMessageForException(e);
        console.log(
          `Backup restore error: ${messageForException ?? 'unknown error'}`,
        );
        let alertDetails = unknownErrorAlertDetails;
        if (
          messageForException === 'user_not_found' ||
          messageForException === 'login_failed'
        ) {
          alertDetails = userNotFoundAlertDetails;
        } else if (
          messageForException === 'unsupported_version' ||
          messageForException === 'client_version_unsupported' ||
          messageForException === 'use_new_flow'
        ) {
          alertDetails = appOutOfDateAlertDetails;
        }
        Alert.alert(
          alertDetails.title,
          alertDetails.message,
          [{ text: 'OK', onPress: props.navigation.goBack }],
          { cancelable: false },
        );
      }
    })();
    // We want this effect to run exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Restoring from backup</Text>
        <Text style={styles.section}>
          Your data is currently being restored.
        </Text>
        <Text style={styles.section}>
          You will be automatically navigated to the app after this process is
          finished.
        </Text>
        <View style={styles.progressContainer}>
          <Progress.CircleSnail
            indeterminate
            color={colors.panelForegroundIcon}
            size={100}
            strokeCap="round"
          />
        </View>
      </AuthContentContainer>
    </AuthContainer>
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
  progressContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default RestoreBackupScreen;
