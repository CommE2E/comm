// @flow

import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { type SetState } from 'lib/types/hook-types.js';
import { type ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import Button from '../../components/button.react.js';
import { useModalContext } from '../modal-provider.react.js';
import css from './thread-settings-modal.css';

type ThreadSettingsDeleteTabProps = {
  +inputDisabled: boolean,
  +threadInfo: ThreadInfo,
  +setErrorMessage: SetState<string>,
};

function ThreadSettingsDeleteTab(
  props: ThreadSettingsDeleteTabProps,
): React.Node {
  const { inputDisabled, threadInfo, setErrorMessage } = props;

  const modalContext = useModalContext();
  const dispatchActionPromise = useDispatchActionPromise();
  const callDeleteThread = useServerCall(deleteThread);

  const accountPasswordInputRef = React.useRef();
  const [accountPassword, setAccountPassword] = React.useState('');

  const onChangeAccountPassword = React.useCallback(
    (event: SyntheticEvent<HTMLInputElement>) => {
      const target = event.currentTarget;
      setAccountPassword(target.value);
    },
    [],
  );

  const deleteThreadAction = React.useCallback(async () => {
    try {
      const response = await callDeleteThread(threadInfo.id, accountPassword);
      modalContext.popModal();
      return response;
    } catch (e) {
      setErrorMessage(
        e.message === 'invalid_credentials'
          ? 'wrong password'
          : 'unknown error',
      );
      setAccountPassword('');
      accountPasswordInputRef.current?.focus();
      throw e;
    }
  }, [
    accountPassword,
    callDeleteThread,
    modalContext,
    setAccountPassword,
    setErrorMessage,
    threadInfo.id,
  ]);

  const onDelete = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatchActionPromise(deleteThreadActionTypes, deleteThreadAction());
    },
    [deleteThreadAction, dispatchActionPromise],
  );

  return (
    <form method="POST">
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
      <Button onClick={onDelete} variant="danger" disabled={inputDisabled}>
        Delete
      </Button>
    </form>
  );
}

export default ThreadSettingsDeleteTab;
