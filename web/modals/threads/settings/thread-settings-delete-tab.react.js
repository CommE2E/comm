// @flow

import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  childThreadInfos,
  threadInfoSelector,
} from 'lib/selectors/thread-selectors.js';
import { type SetState } from 'lib/types/hook-types.js';
import { threadTypes as ThreadTypesEnum } from 'lib/types/thread-types-enum.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import SubmitSection from './submit-section.react.js';
import ThreadDeleteConfirmationModal from './thread-settings-delete-confirmation-modal.react.js';
import css from './thread-settings-delete-tab.css';
import { buttonThemes } from '../../../components/button.react.js';
import { useSelector } from '../../../redux/redux-utils.js';

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
  const childThreads = useSelector(
    state => childThreadInfos(state)[threadInfo.id],
  );
  const currentThreadType = useSelector(
    state => threadInfoSelector(state)[threadInfo.id]?.type,
  );
  const isChannelRoot = React.useMemo(
    () =>
      currentThreadType === ThreadTypesEnum.COMMUNITY_ROOT ||
      currentThreadType === ThreadTypesEnum.COMMUNITY_ANNOUNCEMENT_ROOT,
    [currentThreadType],
  );
  const hasChildThreads = React.useMemo(
    () => childThreads?.length > 0,
    [childThreads?.length],
  );

  const popThreadDeleteConfirmationModal = React.useCallback(() => {
    if (hasChildThreads) {
      modalContext.popModal();
    }
  }, [hasChildThreads, modalContext]);

  const deleteThreadAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await callDeleteThread(threadInfo.id);
      popThreadDeleteConfirmationModal();
      modalContext.popModal();
      return response;
    } catch (e) {
      popThreadDeleteConfirmationModal();
      setErrorMessage(
        e.message === 'invalid_credentials'
          ? 'permission not granted'
          : 'unknown error',
      );
      throw e;
    }
  }, [
    callDeleteThread,
    modalContext,
    popThreadDeleteConfirmationModal,
    setErrorMessage,
    threadInfo.id,
  ]);

  const dispatchDeleteThreadAction = React.useCallback(() => {
    dispatchActionPromise(deleteThreadActionTypes, deleteThreadAction());
  }, [dispatchActionPromise, deleteThreadAction]);

  const onDelete = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (hasChildThreads) {
        modalContext.pushModal(
          <ThreadDeleteConfirmationModal
            isDeletingRootChannel={isChannelRoot}
            onConfirmation={dispatchDeleteThreadAction}
          />,
        );
      } else {
        dispatchDeleteThreadAction();
      }
    },
    [dispatchDeleteThreadAction, hasChildThreads, isChannelRoot, modalContext],
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
