// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import {
  markBackupAsRestoredActionType,
  resetBackupRestoreStateActionType,
} from 'lib/actions/backup-actions.js';
import { logOutActionTypes, useLogOut } from 'lib/actions/user-actions.js';
import { useDeviceKind } from 'lib/hooks/primary-device-hooks.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  getMessageForException,
  BackupIsNewerError,
} from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import AuthButtonContainer from './auth-components/auth-button-container.react.js';
import AuthContainer from './auth-components/auth-container.react.js';
import AuthContentContainer from './auth-components/auth-content-container.react.js';
import type { AuthNavigationProp } from './registration/auth-navigator.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import type { NavAction } from '../navigation/navigation-context.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { LoggedOutModalRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import { backupIsNewerThanAppAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';

type ScreenProps = {
  +navigation: AuthNavigationProp<'RestoreBackupErrorScreen'>,
  +route: NavigationRoute<'RestoreBackupErrorScreen'>,
};

type ErrorInfo =
  | {
      +type: 'restore_failed',
      +restoreType?: 'primary' | 'secondary',
    }
  | {
      +type: 'generic_error',
      +errorTitle: string,
      +errorMessage: string,
      +rawErrorMessage?: ?string,
      +returnNavAction?: ?NavAction,
    };

export type RestoreBackupErrorScreenParams = {
  +errorInfo: ErrorInfo,
};

type RestorationFailedViewProps = {
  +navigation: ScreenProps['navigation'],
  +error: ?Error,
  +restoreType?: 'primary' | 'secondary',
};
function RestorationFailedView(props: RestorationFailedViewProps): React.Node {
  const styles = useStyles(unboundStyles);
  const { error, navigation } = props;

  const errorDetails = React.useMemo(() => {
    const errorMessage = getMessageForException(error);
    if (!errorMessage && navigation.isFocused()) {
      console.warn('Restore error screen shown but no error is stored');
    }
    return errorMessage ?? 'unknown_error';
  }, [error, navigation]);

  const deviceKind = useDeviceKind();
  const deviceType = props.restoreType ?? deviceKind;

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const loggedIn = useSelector(isLoggedIn);
  const logOut = useLogOut();

  const ignoreErrorAndLogIn = React.useCallback(() => {
    dispatch({
      type: markBackupAsRestoredActionType,
    });
  }, [dispatch]);

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
    if (loggedIn) {
      void dispatchActionPromise(logOutActionTypes, logOut());
    } else {
      dispatch({
        type: resetBackupRestoreStateActionType,
      });
    }

    navigation.navigate(LoggedOutModalRouteName);
  }, [navigation, loggedIn, logOut, dispatch, dispatchActionPromise]);

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

type SimpleErrorViewProps = {
  +title: string,
  +message: string,
  +rawErrorMessage?: ?string,
  +onTryAgain?: () => void,
};
function SimpleErrorView(props: SimpleErrorViewProps): React.Node {
  const { onTryAgain, title, message, rawErrorMessage } = props;

  const styles = useStyles(unboundStyles);

  let rawErrorContents;
  if (rawErrorMessage) {
    rawErrorContents = (
      <View style={styles.errorDetailsContainer}>
        <Text style={styles.errorDetailsHeader}>Error message:</Text>
        <Text style={styles.errorDetails}>{rawErrorMessage}</Text>
      </View>
    );
  }

  let tryAgainButton;
  if (onTryAgain) {
    tryAgainButton = (
      <PrimaryButton onPress={onTryAgain} label="Try again" variant="enabled" />
    );
  }

  return (
    <AuthContainer>
      <AuthContentContainer style={styles.scrollViewContentContainer}>
        <Text style={styles.header}>{title}</Text>
        <Text style={styles.section}>{message}</Text>
        {rawErrorContents}
      </AuthContentContainer>
      <AuthButtonContainer>{tryAgainButton}</AuthButtonContainer>
    </AuthContainer>
  );
}

function RestoreBackupErrorScreen(props: ScreenProps): React.Node {
  const { navigation } = props;
  const { errorInfo } = props.route.params;

  const userDataError = useSelector(state =>
    state.restoreBackupState.status === 'user_data_restore_failed'
      ? state.restoreBackupState.payload.error
      : null,
  );

  const handleTryAgain = React.useCallback(() => {
    if (!errorInfo.returnNavAction) {
      return;
    }
    navigation.dispatch(errorInfo.returnNavAction);
  }, [errorInfo.returnNavAction, navigation]);

  if (errorInfo.type === 'restore_failed') {
    const { restoreType } = errorInfo;

    if (userDataError && userDataError instanceof BackupIsNewerError) {
      return (
        <SimpleErrorView
          title={backupIsNewerThanAppAlertDetails.title}
          message={backupIsNewerThanAppAlertDetails.message}
        />
      );
    }

    return (
      <RestorationFailedView
        navigation={props.navigation}
        restoreType={restoreType}
        error={userDataError}
      />
    );
  }

  const { errorTitle, errorMessage } = errorInfo;
  return (
    <SimpleErrorView
      title={errorTitle}
      message={errorMessage}
      onTryAgain={handleTryAgain}
    />
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
