// @flow

import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { useModalContext } from 'lib/components/modal-provider.react';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { type SetState } from 'lib/types/hook-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { buttonThemes } from '../../../components/button.react';
import SubmitSection from './submit-section.react';
import css from './thread-settings-delete-tab.css';

type ThreadSettingsDeleteTabProps = {
  +threadSettingsOperationInProgress: boolean,
  +threadInfo: ThreadInfo,
  +setErrorMessage: SetState<?string>,
  +errorMessage?: ?string,
};

function ThreadSettingsDeleteTab(
  props: ThreadSettingsDeleteTabProps,
): React.Node {
  const {
    threadSettingsOperationInProgress,
    threadInfo,
    setErrorMessage,
    errorMessage,
  } = props;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callDeleteThread = useServerCall(deleteThread);

  const deleteThreadAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await callDeleteThread(threadInfo.id);
      modalContext.popModal();
      return response;
    } catch (e) {
      setErrorMessage(
        e.message === 'invalid_credentials'
          ? 'permission not granted'
          : 'unknown error',
      );
      throw e;
    }
  }, [callDeleteThread, modalContext, setErrorMessage, threadInfo.id]);

  const onDelete = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatchActionPromise(deleteThreadActionTypes, deleteThreadAction());
    },
    [deleteThreadAction, dispatchActionPromise],
  );

  return (
    <form method="POST" className={css.container}>
      <div>
        <div className={css.warning_container}>
          <SWMansionIcon
            icon="warning-circle"
            className={css.warning_icon}
            size={26}
          />
          <p className={css.deletion_warning}>
            Your chat will be permanently deleted. There is no way to reverse
            this.
          </p>
        </div>
      </div>
      <SubmitSection
        errorMessage={errorMessage}
        onClick={onDelete}
        variant="filled"
        buttonColor={buttonThemes.danger}
        disabled={threadSettingsOperationInProgress}
      >
        Delete
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsDeleteTab;
