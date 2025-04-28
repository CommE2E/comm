// @flow

import * as React from 'react';

import {
  changeThreadSettingsActionTypes,
  useChangeThreadSettings,
  deleteThreadActionTypes,
  useDeleteThread,
} from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import { containedThreadInfos } from 'lib/selectors/thread-selectors.js';
import { type SetState } from 'lib/types/hook-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ThreadChanges } from 'lib/types/thread-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import ThreadDeleteConfirmationModal from './thread-settings-delete-confirmation-modal.react.js';
import { useSelector } from '../../../redux/redux-utils.js';

type UseOnSaveGeneralThreadSettingsParams = {
  +threadInfo: ThreadInfo,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<?string>,
};

function useOnSaveGeneralThreadSettings(
  params: UseOnSaveGeneralThreadSettingsParams,
): (event: SyntheticEvent<HTMLElement>) => mixed {
  const { threadInfo, queuedChanges, setQueuedChanges, setErrorMessage } =
    params;

  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const changeThreadSettingsInput = {
        threadInfo,
        threadID: threadInfo.id,
        changes: queuedChanges,
      };

      return await callChangeThreadSettings(changeThreadSettingsInput);
    } catch (e) {
      setErrorMessage('unknown_error');
      throw e;
    } finally {
      setQueuedChanges(Object.freeze({}));
    }
  }, [
    callChangeThreadSettings,
    queuedChanges,
    setErrorMessage,
    setQueuedChanges,
    threadInfo,
  ]);

  const onSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      void dispatchActionPromise(
        changeThreadSettingsActionTypes,
        changeThreadSettingsAction(),
      );
    },
    [changeThreadSettingsAction, dispatchActionPromise],
  );

  return onSubmit;
}

type UseOnSavePrivacySettingsParams = {
  +threadInfo: ThreadInfo,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<?string>,
};

function useOnSavePrivacyThreadSettings(
  params: UseOnSavePrivacySettingsParams,
): (event: SyntheticEvent<HTMLElement>) => mixed {
  const { threadInfo, queuedChanges, setQueuedChanges, setErrorMessage } =
    params;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useChangeThreadSettings();

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await callChangeThreadSettings({
        threadID: threadInfo.id,
        changes: queuedChanges,
        threadInfo,
      });
      modalContext.popModal();
      return response;
    } catch (e) {
      setErrorMessage('unknown_error');
      setQueuedChanges(Object.freeze({}));
      throw e;
    }
  }, [
    callChangeThreadSettings,
    modalContext,
    queuedChanges,
    setErrorMessage,
    setQueuedChanges,
    threadInfo,
  ]);

  const onSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      void dispatchActionPromise(
        changeThreadSettingsActionTypes,
        changeThreadSettingsAction(),
      );
    },
    [changeThreadSettingsAction, dispatchActionPromise],
  );

  return onSubmit;
}

type UseOnDeleteParams = {
  +threadInfo: ThreadInfo,
  +setErrorMessage: SetState<?string>,
};

function useOnDeleteThread(
  params: UseOnDeleteParams,
): (event: SyntheticEvent<HTMLElement>) => mixed {
  const { threadInfo, setErrorMessage } = params;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callDeleteThread = useDeleteThread();
  const containedThreads = useSelector(
    state => containedThreadInfos(state)[threadInfo.id],
  );

  const shouldUseDeleteConfirmationModal = React.useMemo(
    () => containedThreads?.length > 0,
    [containedThreads?.length],
  );

  const popThreadDeleteConfirmationModal = React.useCallback(() => {
    if (shouldUseDeleteConfirmationModal) {
      modalContext.popModal();
    }
  }, [modalContext, shouldUseDeleteConfirmationModal]);

  const deleteThreadAction = React.useCallback(async () => {
    try {
      setErrorMessage('');
      const response = await callDeleteThread({ threadID: threadInfo.id });
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
    void dispatchActionPromise(deleteThreadActionTypes, deleteThreadAction());
  }, [dispatchActionPromise, deleteThreadAction]);

  const onDelete = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (shouldUseDeleteConfirmationModal) {
        modalContext.pushModal(
          <ThreadDeleteConfirmationModal
            threadInfo={threadInfo}
            onConfirmation={dispatchDeleteThreadAction}
          />,
        );
      } else {
        dispatchDeleteThreadAction();
      }
    },
    [
      dispatchDeleteThreadAction,
      modalContext,
      shouldUseDeleteConfirmationModal,
      threadInfo,
    ],
  );

  return onDelete;
}

export {
  useOnSaveGeneralThreadSettings,
  useOnSavePrivacyThreadSettings,
  useOnDeleteThread,
};
