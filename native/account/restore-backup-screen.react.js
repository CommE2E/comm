// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import * as Progress from 'react-native-progress';

import type { SignedMessage } from 'lib/types/siwe-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { fullBackupSupport } from 'lib/utils/services-utils.js';

import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import { setNativeCredentials } from './native-credentials.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import { useRestore, useV1Login } from './restore.js';
import { commCoreModule } from '../native-modules.js';
import { logInActionType } from '../navigation/action-types.js';
import type { NavAction } from '../navigation/navigation-context.js';
import {
  RestoreBackupErrorScreenRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  networkErrorAlertDetails,
  unknownErrorAlertDetails,
  userNotFoundAlertDetails,
  passwordLoginErrorAlertDetails,
  siweLoginErrorAlertDetails,
  userKeysRestoreErrorAlertDetails,
} from '../utils/alert-messages.js';

type Props = {
  +navigation: AuthNavigationProp<'RestoreBackupScreen'>,
  +route: NavigationRoute<'RestoreBackupScreen'>,
};

type PrimaryRestoreInfo = {
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

export type RestoreBackupScreenParams = {
  +primaryRestoreInfo?: PrimaryRestoreInfo,
  +returnNavAction?: NavAction,
};

function RestoreBackupScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { primaryRestoreInfo, returnNavAction } = props.route.params || {};

  const restore = useRestore();
  const performV1Login = useV1Login();

  const isRestoreError = useSelector(
    state => state.restoreBackupState.status === 'user_data_restore_failed',
  );
  const restoreHasStarted = useSelector(
    state => state.restoreBackupState.status !== 'no_backup',
  );

  // Only start restoration if we have the necessary data
  const shouldStartRestore = !!primaryRestoreInfo;

  React.useEffect(() => {
    const removeListener = props.navigation.addListener('beforeRemove', e => {
      if (e.data.action.type !== logInActionType) {
        e.preventDefault();
      }
    });
    if (isRestoreError && fullBackupSupport) {
      props.navigation.navigate(RestoreBackupErrorScreenRouteName, {
        errorInfo: {
          type: 'restore_failed',
          restoreType: 'primary',
        },
      });
      return removeListener;
    }
    if ((restoreHasStarted || !shouldStartRestore) && fullBackupSupport) {
      return removeListener;
    }
    void (async () => {
      if (!primaryRestoreInfo) {
        return;
      }
      const { userIdentifier, credentials } = primaryRestoreInfo;

      let step;
      const setStep = (newStep: string) => {
        step = newStep;
      };
      try {
        if (credentials.type === 'password') {
          await restore(
            userIdentifier,
            credentials.password,
            undefined,
            setStep,
          );
          await setNativeCredentials({
            username: userIdentifier,
            password: credentials.password,
          });
        } else {
          await commCoreModule.setSIWEBackupSecrets(credentials.backup);
          await restore(
            userIdentifier,
            credentials.backup.signature,
            credentials.socialProof,
            setStep,
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
        } else if (messageForException === 'network_error') {
          alertDetails = networkErrorAlertDetails;
        } else if (messageForException === 'use_v1_flow') {
          try {
            await performV1Login(userIdentifier, credentials);
            return;
          } catch (err) {
            console.log(
              `Error while trying to perform v1 login: ${
                getMessageForException(err) ?? ''
              }`,
            );
            alertDetails =
              credentials.type === 'password'
                ? passwordLoginErrorAlertDetails
                : siweLoginErrorAlertDetails;
          }
        } else if (step === 'user_keys_restore') {
          alertDetails = userKeysRestoreErrorAlertDetails;
        } else if (step === 'user_data_restore') {
          props.navigation.navigate(RestoreBackupErrorScreenRouteName, {
            errorInfo: {
              type: 'restore_failed',
              restoreType: 'primary',
            },
          });
          return;
        }

        removeListener();
        props.navigation.navigate(RestoreBackupErrorScreenRouteName, {
          errorInfo: {
            type: 'generic_error',
            errorTitle: alertDetails.title,
            errorMessage: alertDetails.message,
            rawErrorMessage: messageForException,
            returnNavAction,
          },
        });
      }
    })();
    return removeListener;
    // We want this effect to run exactly once for the core logic, but it should
    // update when shouldStartRestore changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStartRestore]);

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
