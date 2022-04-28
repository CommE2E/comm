// @flow

import * as React from 'react';

import { threadTypeDescriptions } from 'lib/shared/thread-utils';
import { type SetState } from 'lib/types/hook-types';
import {
  type ThreadInfo,
  type ThreadChanges,
  assertThreadType,
  threadTypes,
} from 'lib/types/thread-types';

import css from './thread-settings-privacy-tab.css';

const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

type ThreadSettingsPrivacyTabProps = {
  +inputDisabled: boolean,
  +threadInfo: ThreadInfo,
  +queuedChanges: ThreadChanges,
  +setQueuedChanges: SetState<ThreadChanges>,
};
function ThreadSettingsPrivacyTab(
  props: ThreadSettingsPrivacyTabProps,
): React.Node {
  const { inputDisabled, threadInfo, queuedChanges, setQueuedChanges } = props;

  const onChangeThreadType = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const uiValue = assertThreadType(parseInt(event.currentTarget.value, 10));
      setQueuedChanges(
        Object.freeze({
          ...queuedChanges,
          type: uiValue !== threadInfo.type ? uiValue : undefined,
        }),
      );
    },
    [queuedChanges, setQueuedChanges, threadInfo.type],
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
    </div>
  );
}

export default ThreadSettingsPrivacyTab;
