// @flow

import { CommonActions, useFocusEffect } from '@react-navigation/core';
import * as React from 'react';
import { View, Text } from 'react-native';
import * as Progress from 'react-native-progress';

import { useSecondaryDeviceQRAuthContext } from 'lib/components/secondary-device-qr-auth-context-provider.react.js';
import { getMessageForException } from 'lib/utils/errors.js';

import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import {
  RestoreBackupErrorScreenRouteName,
  QRCodeScreenRouteName,
  type NavigationRoute,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import {
  appOutOfDateAlertDetails,
  networkErrorAlertDetails,
  unknownErrorAlertDetails,
} from '../utils/alert-messages.js';

type ProgressStepProps = {
  +stepNumber: string,
  +state: 'pending' | 'active' | 'completed',
  +label: string,
};

function ProgressStep(props: ProgressStepProps): React.Node {
  const { stepNumber, state, label } = props;
  const styles = useStyles(unboundStyles);
  // const colors = useColors();

  const stepStyle = React.useMemo(() => {
    switch (state) {
      case 'completed':
        return [styles.stepIcon, styles.stepIconCompleted];
      case 'active':
        return [styles.stepIcon, styles.stepIconActive];
      default:
        return [styles.stepIcon, styles.stepIconPending];
    }
  }, [state, styles]);

  const stepContent = state === 'completed' ? '✓' : stepNumber;

  return (
    <View style={styles.stepContainer}>
      <View style={stepStyle}>
        <Text style={styles.stepIconText}>{stepContent}</Text>
      </View>
      <View style={styles.stepLabelContainer}>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
    </View>
  );
}

type Props = {
  +navigation: AuthNavigationProp<'QRAuthProgressScreen'>,
  +route: NavigationRoute<'QRAuthProgressScreen'>,
};

function QRAuthProgressScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { qrAuthInProgress, registerErrorListener } =
    useSecondaryDeviceQRAuthContext();
  const userDataRestoreStarted = useSelector(
    state => state.restoreBackupState.status !== 'no_backup',
  );

  useFocusEffect(
    React.useCallback(() => {
      if (!registerErrorListener) {
        return undefined;
      }
      const subscription = registerErrorListener((error, isUserDataError) => {
        if (isUserDataError) {
          // user data errors are handled by LogInHandler
          return;
        }

        const messageForException = getMessageForException(error);
        let alertDetails = unknownErrorAlertDetails;
        if (
          messageForException === 'client_version_unsupported' ||
          messageForException === 'unsupported_version'
        ) {
          alertDetails = appOutOfDateAlertDetails;
        } else if (messageForException === 'network_error') {
          alertDetails = networkErrorAlertDetails;
        }
        props.navigation.navigate(RestoreBackupErrorScreenRouteName, {
          errorInfo: {
            type: 'generic_error',
            errorTitle: alertDetails.title,
            errorMessage: alertDetails.message,
            rawErrorMessage: messageForException,
            returnNavAction: CommonActions.navigate({
              name: QRCodeScreenRouteName,
            }),
          },
        });
      });

      return () => subscription.remove();
    }, [registerErrorListener, props.navigation]),
  );

  const step: 'authenticating' | 'restoring' =
    qrAuthInProgress && !userDataRestoreStarted
      ? 'authenticating'
      : 'restoring';

  const authStepState = step === 'authenticating' ? 'active' : 'completed';
  const restoringStepState = step === 'restoring' ? 'active' : 'pending';
  const title =
    step === 'authenticating' ? 'Authenticating device' : 'Restoring your data';

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.container}>
        <Text style={styles.title}>{title}...</Text>

        <View style={styles.progressSteps}>
          <ProgressStep
            stepNumber="1"
            state={authStepState}
            label="Authentication"
          />
          <View style={styles.stepConnector} />
          <ProgressStep
            stepNumber="2"
            state={restoringStepState}
            label="Data restoration"
          />
          <View style={styles.stepConnector} />
          <ProgressStep stepNumber="3" state="pending" label="Complete" />
        </View>
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
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: 'panelForegroundLabel',
    paddingBottom: 40,
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
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepIconPending: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'panelSecondaryForegroundBorder',
  },
  stepIconActive: {
    backgroundColor: 'purpleButton',
    borderWidth: 2,
    borderColor: 'violetLight100',
  },
  stepIconCompleted: {
    backgroundColor: 'greenIndicatorInner',
    borderWidth: 2,
    borderColor: 'greenIndicatorOuter',
  },
  stepIconText: {
    color: 'panelForegroundIcon',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepLabelContainer: {
    maxWidth: 100,
    height: 48,
    justifyContent: 'center',
  },
  stepLabel: {
    color: 'panelForegroundLabel',
    fontSize: 14,
    textAlign: 'center',
  },
  stepConnector: {
    width: 30,
    height: 2,
    backgroundColor: 'panelSecondaryForegroundBorder',
    marginHorizontal: 10,
    marginBottom: 48,
  },
};

export default QRAuthProgressScreen;
