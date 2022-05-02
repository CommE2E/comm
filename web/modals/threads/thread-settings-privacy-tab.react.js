// @flow

import * as React from 'react';

import {
  changeThreadSettings,
  changeThreadSettingsActionTypes,
} from 'lib/actions/thread-actions.js';
import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { type SetState } from 'lib/types/hook-types';
import {
  type ThreadInfo,
  type ThreadChanges,
  assertThreadType,
  threadTypes,
} from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import Button from '../../components/button.react.js';
import { useModalContext } from '../modal-provider.react.js';
import css from './thread-settings-privacy-tab.css';

const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

type ThreadSettingsPrivacyTabProps = {
  +inputDisabled: boolean,
  +threadInfo: ThreadInfo,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
  +setErrorMessage: SetState<string>,
};
function ThreadSettingsPrivacyTab(
  props: ThreadSettingsPrivacyTabProps,
): React.Node {
  const {
    inputDisabled,
    threadInfo,
    queuedChanges,
    setQueuedChanges,
    setErrorMessage,
  } = props;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callChangeThreadSettings = useServerCall(changeThreadSettings);

  const changeQueued: boolean = React.useMemo(
    () => Object.values(queuedChanges).some(v => v !== null && v !== undefined),
    [queuedChanges],
  );

  const onChangeThreadType = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const uiValue = assertThreadType(parseInt(event.currentTarget.value, 10));
      setQueuedChanges(prevQueuedChanges =>
        Object.freeze({
          ...prevQueuedChanges,
          type: uiValue !== threadInfo.type ? uiValue : undefined,
        }),
      );
    },
    [setQueuedChanges, threadInfo.type],
  );

  const changeThreadSettingsAction = React.useCallback(async () => {
    try {
      const response = await callChangeThreadSettings({
        threadID: threadInfo.id,
        changes: queuedChanges,
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
    threadInfo.id,
  ]);

  const onSubmit = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatchActionPromise(
        changeThreadSettingsActionTypes,
        changeThreadSettingsAction(),
      );
    },
    [changeThreadSettingsAction, dispatchActionPromise],
  );

  return (
    <div className={css.edit_thread_privacy_container}>
      <div className={css['modal-radio-selector']}>
        <div className={css.form_title}>Thread type</div>
        <div className={css.form_enum_selector}>
          <div className={css.form_enum_container}>
            <input
              type="radio"
              name="edit-thread-type"
              id="edit-thread-open"
              value={COMMUNITY_OPEN_SUBTHREAD}
              checked={
                (queuedChanges.type ?? threadInfo.type) ===
                COMMUNITY_OPEN_SUBTHREAD
              }
              onChange={onChangeThreadType}
              disabled={inputDisabled}
            />
            <div className={css.form_enum_option}>
              <label htmlFor="edit-thread-open">
                Open
                <span className={css.form_enum_description}>
                  {threadTypeDescriptions[COMMUNITY_OPEN_SUBTHREAD]}
                </span>
              </label>
            </div>
          </div>
          <div className={css.form_enum_container}>
            <input
              type="radio"
              name="edit-thread-type"
              id="edit-thread-closed"
              value={COMMUNITY_SECRET_SUBTHREAD}
              checked={
                (queuedChanges.type ?? threadInfo.type) ===
                COMMUNITY_SECRET_SUBTHREAD
              }
              onChange={onChangeThreadType}
              disabled={inputDisabled}
            />
            <div className={css.form_enum_option}>
              <label htmlFor="edit-thread-closed">
                Secret
                <span className={css.form_enum_description}>
                  {threadTypeDescriptions[COMMUNITY_SECRET_SUBTHREAD]}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <Button
        type="submit"
        onClick={onSubmit}
        disabled={inputDisabled || !changeQueued}
        className={css.save_button}
      >
        Save
      </Button>
    </div>
  );
}

export default ThreadSettingsPrivacyTab;
