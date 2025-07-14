// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import { getMessageForException } from 'lib/utils/errors.js';

import AuthButtonContainer from './auth-components/auth-button-container.react.js';
import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import Alert from '../utils/alert.js';

type Props = {
  +navigation: AuthNavigationProp<'RestoreBackupErrorScreen'>,
  +route: NavigationRoute<'RestoreBackupErrorScreen'>,
};

export type RestoreBackupErrorScreenParams = {
  +deviceType: 'primary' | 'secondary',
  +errorDetails?: ?string,
};

function RestoreBackupErrorScreen(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const { deviceType, errorDetails: errorDetailsProp } = props.route.params;

  const storedError = useSelector(state =>
    state.restoreBackupState.status === 'user_data_restore_failed'
      ? state.restoreBackupState.payload.error
      : null,
  );
  const errorDetails = React.useMemo(() => {
    if (errorDetailsProp) {
      return errorDetailsProp;
    } else if (storedError) {
      const messageForException = getMessageForException(storedError);
      return messageForException ?? 'unknown_error';
    }

    console.warn('Restore error screen shown but no error details provided');
    return 'unknown_error';
  }, [errorDetailsProp, storedError]);

  const ignoreErrorAndLogIn = React.useCallback(() => {
    // TODO: Not implemented
  }, []);

  const onPressIgnore = React.useCallback(() => {
    Alert.alert(
      'Continue without full restoration?',
      'Some of your data could not be restored from backup. You can still use the app, but recent messages and settings may be missing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: ignoreErrorAndLogIn,
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  }, [ignoreErrorAndLogIn]);

  const onPressTryAgain = React.useCallback(() => {
    // TODO: Not implemented
  }, []);

  const deviceTypeWarning = React.useMemo(() => {
    if (deviceType === 'secondary') {
      return (
        <Text style={styles.section}>
          Your backup appears to be corrupt. Be careful with your primary
          device, as you may lose data if you log out of it at this time.
        </Text>
      );
    } else {
      return (
        <Text style={styles.section}>
          Failed to restore your data from backup.
        </Text>
      );
    }
  }, [deviceType, styles.section]);

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>Restoration failed</Text>
        {deviceTypeWarning}
        <View style={styles.errorDetailsContainer}>
          <Text style={styles.errorDetailsHeader}>Error message:</Text>
          <Text style={styles.errorDetails}>{errorDetails}</Text>
        </View>
        <Text style={styles.section}>
          For help recovering your data, email support@comm.app or message
          Ashoat on the app.
        </Text>
      </AuthContentContainer>
      <AuthButtonContainer>
        <PrimaryButton
          onPress={onPressTryAgain}
          label="Try again"
          variant="enabled"
        />
        <PrimaryButton
          onPress={onPressIgnore}
          label="Log in without restoring"
          variant="outline"
        />
      </AuthButtonContainer>
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
  errorDetailsContainer: {
    backgroundColor: 'codeBackground',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorDetailsHeader: {
    fontFamily: 'Arial',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'panelForegroundLabel',
    marginBottom: 8,
  },
  errorDetails: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: 'panelForegroundSecondaryLabel',
    lineHeight: 16,
  },
  scrollViewContentContainer: {
    flexGrow: 1,
  },
};

export default RestoreBackupErrorScreen;
