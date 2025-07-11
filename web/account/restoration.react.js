// @flow

import * as React from 'react';

import { getMessageForException } from 'lib/utils/errors.js';

import HeaderSeparator from './header-separator.react.js';
import css from './restoration.css';
import Button, { buttonThemes } from '../components/button.react.js';
import LoadingIndicator from '../loading-indicator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStaffCanSee } from '../utils/staff-utils.js';

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

type RestorationErrorProps = {
  +error: Error,
  +step: RestorationStep,
};

function RestorationError(props: RestorationErrorProps): React.Node {
  const { step, error } = props;

  const errorDetails = React.useMemo(() => {
    const messageForException = getMessageForException(error);
    return messageForException ?? 'unknown error';
  }, [error]);

  const onPressIgnore = React.useCallback(() => {
    // TODO: Not implemented
  }, []);

  const onPressTryAgain = React.useCallback(() => {
    // TODO: Not implemented
  }, []);

  return (
    <RestorationViewContainer
      title="Restoration failed"
      step={step}
      isError={true}
    >
      <div className={css.errorMessageContainer}>
        <div className={css.modalText}>
          Your backup appears to be corrupt. Be careful with your primary
          device, as you may lose data if you log out of it at this time.
        </div>
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

export type RestorationProgressProps = {
  +qrAuthInProgress: boolean,
  +userDataRestoreStarted: boolean,
};

function RestorationProgress(props: RestorationProgressProps): React.Node {
  const { qrAuthInProgress, userDataRestoreStarted } = props;

  const restorationError = useSelector(state =>
    state.restoreBackupState.status === 'user_data_restore_failed'
      ? state.restoreBackupState.payload.error
      : null,
  );

  const step: RestorationStep =
    qrAuthInProgress && !userDataRestoreStarted
      ? 'authenticating'
      : 'restoring';

  if (restorationError) {
    return <RestorationError step={step} error={restorationError} />;
  }

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

export default RestorationProgress;
