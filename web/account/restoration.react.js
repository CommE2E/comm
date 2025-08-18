// @flow

import * as React from 'react';

import {
  markBackupAsRestoredActionType,
  resetBackupRestoreStateActionType,
} from 'lib/actions/backup-actions.js';
import {
  logOutActionTypes,
  useSecondaryDeviceLogOut,
} from 'lib/actions/user-actions.js';
import { useSecondaryDeviceQRAuthContext } from 'lib/components/secondary-device-qr-auth-context-provider.react.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import {
  BackupIsNewerError,
  getMessageForException,
} from 'lib/utils/errors.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import HeaderSeparator from './header-separator.react.js';
import css from './restoration.css';
import Button, { buttonThemes } from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';
import {
  getBackupIsNewerThanAppError,
  getVersionUnsupportedError,
} from '../utils/version-utils.js';

type RestorationStep = 'authenticating' | 'restoring';

type ProgressStepProps = {
  +iconText: string,
  +state: 'pending' | 'active' | 'completed' | 'errored',
  +children?: React.Node,
};
function ProgressStep(props: ProgressStepProps): React.Node {
  const { state, children } = props;

  const [iconText, iconClassName] = React.useMemo(() => {
    let content, className;
    switch (state) {
      case 'completed':
        content = '✓';
        className = css.stepIconCompleted;
        break;
      case 'errored':
        content = '✗';
        className = css.stepIconError;
        break;
      case 'active':
        content = props.iconText;
        className = css.stepIconActive;
        break;
      default:
        content = props.iconText;
        className = css.stepIconPending;
    }
    return [content, className];
  }, [state, props.iconText]);

  return (
    <div className={css.stepItem}>
      <div className={iconClassName}>{iconText}</div>
      <span>{children}</span>
    </div>
  );
}

type ContainerProps = {
  +title: string,
  +step: RestorationStep,
  +isError: boolean,
  +children?: React.Node,
};
function RestorationViewContainer(props: ContainerProps): React.Node {
  const { title, step, isError, children } = props;

  const activeStepState = isError ? 'errored' : 'active';
  const authStepState =
    step === 'authenticating' ? activeStepState : 'completed';
  const restoringStepState = step === 'restoring' ? activeStepState : 'pending';

  let debugInfo;
  const restoreState = useSelector(state => state.restoreBackupState);
  const staffCanSee = useStaffCanSee();
  if (staffCanSee) {
    const status = restoreState.status;
    const restoreStep = restoreState.payload.step ?? 'N/A';
    debugInfo = (
      <div className={css.debugInfo}>
        <span>
          [DEBUG] Restore state: {status} (Step: {restoreStep})
        </span>
      </div>
    );
  }

  return (
    <div className={css.modalBody}>
      <h1>{title}</h1>
      <HeaderSeparator />
      <div className={css.content}>
        <div className={css.restorationProgress}>
          <div className={css.progressSteps}>
            <ProgressStep iconText="1" state={authStepState}>
              Authentication
            </ProgressStep>
            <div className={css.stepConnector}></div>
            <ProgressStep iconText="2" state={restoringStepState}>
              Data Restoration
            </ProgressStep>
            <div className={css.stepConnector}></div>
            <ProgressStep iconText="3" state="pending">
              Complete
            </ProgressStep>
          </div>
        </div>
        {children}
        {debugInfo}
      </div>
    </div>
  );
}

type RestorationFailedErrorProps = {
  +error: Error,
};
function RestorationFailedError(
  props: RestorationFailedErrorProps,
): React.Node {
  const { error } = props;

  const dispatch = useDispatch();
  const dispatchActionPromise = useDispatchActionPromise();
  const logOut = useSecondaryDeviceLogOut();
  const loggedIn = useSelector(isLoggedIn);

  const errorDetails = React.useMemo(() => {
    const messageForException = getMessageForException(error);
    return messageForException ?? 'unknown error';
  }, [error]);

  const onPressIgnore = React.useCallback(() => {
    dispatch({
      type: markBackupAsRestoredActionType,
    });
  }, [dispatch]);

  const onPressTryAgain = React.useCallback(() => {
    if (loggedIn) {
      void dispatchActionPromise(logOutActionTypes, logOut());
    } else {
      dispatch({
        type: resetBackupRestoreStateActionType,
      });
    }
  }, [dispatch, dispatchActionPromise, loggedIn, logOut]);

  const userFriendlyErrorMessage = React.useMemo(() => {
    if (errorDetails === 'no_backup_data') {
      return (
        <div className={css.modalText}>
          Your user data backup is not ready yet. Make sure the Comm app on your
          primary device has been updated to the latest version, then try again.
        </div>
      );
    } else {
      return (
        <div className={css.modalText}>
          Your backup appears to be corrupt. Be careful with your primary
          device, as you may lose data if you log out of it at this time.
        </div>
      );
    }
  }, [errorDetails]);

  return (
    <RestorationViewContainer
      title="Restoration failed"
      step="restoring"
      isError={true}
    >
      <div className={css.errorMessageContainer}>
        {userFriendlyErrorMessage}
        <div className={css.errorDetailsContainer}>
          <div className={css.errorDetailsHeader}>Error message:</div>
          <div className={css.errorDetails}>{errorDetails}</div>
        </div>
        <div className={css.modalText}>
          For help recovering your data, email{' '}
          <a href="mailto:support@comm.app">support@comm.app</a> or message
          Ashoat on the app.
        </div>
      </div>
      <div className={css.errorButtons}>
        <Button
          variant="outline"
          buttonColor={buttonThemes.outline}
          onClick={onPressIgnore}
        >
          Log in without restoring
        </Button>
        <Button
          variant="filled"
          buttonColor={buttonThemes.primary}
          onClick={onPressTryAgain}
        >
          Try again
        </Button>
      </div>
    </RestorationViewContainer>
  );
}

type SimpleErrorProps = {
  +title: string,
  +rawErrorMessage?: ?string,
  +step: RestorationStep,
  +onTryAgain?: () => void,
  +children?: React.Node,
};
function SimpleError(props: SimpleErrorProps): React.Node {
  const { title, step, children, rawErrorMessage, onTryAgain } = props;

  let rawErrorContents;
  if (rawErrorMessage) {
    rawErrorContents = (
      <div className={css.errorDetailsContainer}>
        <div className={css.errorDetailsHeader}>Error message:</div>
        <div className={css.errorDetails}>{rawErrorMessage}</div>
      </div>
    );
  }

  let tryAgainButton;
  if (onTryAgain) {
    tryAgainButton = (
      <Button
        variant="filled"
        buttonColor={buttonThemes.primary}
        onClick={onTryAgain}
      >
        Try again
      </Button>
    );
  }

  return (
    <RestorationViewContainer title={title} step={step} isError={true}>
      <div className={css.errorMessageContainer}>
        <div className={css.modalText}>{children}</div>
        {rawErrorContents}
      </div>
      <div className={css.errorButtons}>{tryAgainButton}</div>
    </RestorationViewContainer>
  );
}

export type ProgressViewProps = {
  +step: RestorationStep,
};
function ProgressView(props: ProgressViewProps): React.Node {
  const { step } = props;

  const title =
    step === 'authenticating' ? 'Authenticating device' : 'Restoring your data';

  return (
    <RestorationViewContainer title={title} step={step} isError={false}>
      <div className={css.restorationSpinnerWrapper}>
        <LoadingIndicator status="loading" size="x-large" />
      </div>
    </RestorationViewContainer>
  );
}

type AuthErrorProps = {
  +error: mixed,
  +handleRetry: () => void,
};
function AuthErrorView(props: AuthErrorProps): React.Node {
  const { error, handleRetry } = props;

  const rawErrorMessage = React.useMemo(
    () => getMessageForException(error),
    [error],
  );

  if (
    rawErrorMessage === 'client_version_unsupported' ||
    rawErrorMessage === 'unsupported_version'
  ) {
    return (
      <SimpleError title="App version unsupported" step="authenticating">
        {getVersionUnsupportedError()}
      </SimpleError>
    );
  } else if (rawErrorMessage === 'network_error') {
    return (
      <SimpleError
        title="Network error"
        step="authenticating"
        onTryAgain={handleRetry}
      >
        Failed to contact Comm services. Please check your network connection.
      </SimpleError>
    );
  } else {
    return (
      <SimpleError
        title="Unknown error"
        step="authenticating"
        onTryAgain={handleRetry}
        rawErrorMessage={rawErrorMessage}
      >
        Uhh... try again?
      </SimpleError>
    );
  }
}

type RestoreErrorProps = {
  +error: Error,
};
function RestoreErrorView(props: RestoreErrorProps): React.Node {
  const { error } = props;

  if (error instanceof BackupIsNewerError) {
    return (
      <SimpleError step="restoring" title="App out of date">
        {getBackupIsNewerThanAppError()}
      </SimpleError>
    );
  } else {
    return <RestorationFailedError error={error} />;
  }
}

export type RestorationViewProps = {
  +qrAuthInProgress: boolean,
  +userDataRestoreStarted: boolean,
  +onErrorUIToggle?: (errorShown: boolean) => void,
};
function RestorationView(props: RestorationViewProps): React.Node {
  const { qrAuthInProgress, userDataRestoreStarted, onErrorUIToggle } = props;

  const { registerErrorListener } = useSecondaryDeviceQRAuthContext();
  const [qrAuthError, setQRAuthError] = React.useState<?mixed>(null);
  const userDataError = useSelector(state =>
    state.restoreBackupState.status === 'user_data_restore_failed'
      ? state.restoreBackupState.payload.error
      : null,
  );

  React.useEffect(() => {
    const subscription = registerErrorListener((error, isUserDataError) => {
      if (isUserDataError) {
        // user data errors are handled by selector
        return;
      }
      setQRAuthError(error);
      onErrorUIToggle?.(true);
    });

    return () => subscription.remove();
  }, [registerErrorListener, onErrorUIToggle]);

  const retryQRAuth = React.useCallback(() => {
    setQRAuthError(null);
    onErrorUIToggle?.(false);
  }, [onErrorUIToggle]);

  if (userDataError) {
    return <RestoreErrorView error={userDataError} />;
  } else if (qrAuthError) {
    return <AuthErrorView error={qrAuthError} handleRetry={retryQRAuth} />;
  }

  const step: RestorationStep =
    qrAuthInProgress && !userDataRestoreStarted
      ? 'authenticating'
      : 'restoring';

  return <ProgressView step={step} />;
}

export default RestorationView;
