// @flow

import * as React from 'react';

import { threadTypeDescriptions } from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types.js';

import css from './thread-settings-privacy-tab.css';
const { COMMUNITY_OPEN_SUBTHREAD, COMMUNITY_SECRET_SUBTHREAD } = threadTypes;

type ThreadSettingsPrivacyTabProps = {
  +possiblyChangedThreadType: number,
  +onChangeThreadType: (event: SyntheticEvent<HTMLInputElement>) => void,
  +inputDisabled: boolean,
};
function ThreadSettingsPrivacyTab(
  props: ThreadSettingsPrivacyTabProps,
): React.Node {
  const {
    possiblyChangedThreadType,
    onChangeThreadType,
    inputDisabled,
  } = props;
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
              checked={possiblyChangedThreadType === COMMUNITY_OPEN_SUBTHREAD}
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
              checked={possiblyChangedThreadType === COMMUNITY_SECRET_SUBTHREAD}
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
