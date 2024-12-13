// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

import { getMessageForException } from 'lib/utils/errors.js';

import { setNativeCredentials } from './native-credentials.js';
import RegistrationContainer from './registration/registration-container.react.js';
import RegistrationContentContainer from './registration/registration-content-container.react.js';
import { useRestore } from './restore.js';
import type { SignInNavigationProp } from './sign-in-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  unknownErrorAlertDetails,
  userNotFoundAlertDetails,
} from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type Props = {
  +navigation: SignInNavigationProp<'RestoreBackupScreen'>,
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
        +secret: string,
        +message: string,
        +signature: string,
      },
};

function RestoreBackupScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { userIdentifier, credentials } = props.route.params;

  const goBack = React.useCallback(() => {
    props.navigation.goBack();
  }, [props.navigation]);

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
            credentials.secret,
            credentials.message,
            credentials.signature,
          );
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
          [{ text: 'OK', onPress: goBack }],
          { cancelable: false },
        );
      }
    })();
    // We want this effect to run exactly once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RegistrationContainer>
      <RegistrationContentContainer style={styles.scrollViewContentContainer}>
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
