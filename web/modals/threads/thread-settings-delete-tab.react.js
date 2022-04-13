// @flow

import * as React from 'react';

import css from './thread-settings-modal.css';

type ThreadSettingsDeleteTabProps = {
  +accountPassword: string,
  +onChangeAccountPassword: (event: SyntheticEvent<HTMLInputElement>) => void,
  +inputDisabled: boolean,
  +accountPasswordInputRef: (accountPasswordInput: ?HTMLInputElement) => void,
};

function ThreadSettingsDeleteTab(
  props: ThreadSettingsDeleteTabProps,
): React.Node {
  const {
    accountPassword,
    onChangeAccountPassword,
    inputDisabled,
    accountPasswordInputRef,
  } = props;
  return (
    <>
      <div>
        <p className={css.italic}>
          Your thread will be permanently deleted. There is no way to reverse
          this.
        </p>
      </div>
      <div className={css.edit_thread_account_password}>
        <p className={css.confirm_account_password}>
          Please enter your account password to confirm your identity
        </p>
        <div className={css.form_title}>Account password</div>
        <div className={css.form_content}>
          <input
            type="password"
            placeholder="Personal account password"
            value={accountPassword}
            onChange={onChangeAccountPassword}
            disabled={inputDisabled}
            ref={accountPasswordInputRef}
          />
        </div>
      </div>
    </>
  );
}

export default ThreadSettingsDeleteTab;
