// @flow

import * as React from 'react';

import {
  deleteThreadActionTypes,
  deleteThread,
} from 'lib/actions/thread-actions';
import { type SetState } from 'lib/types/hook-types';
import { type ThreadInfo } from 'lib/types/thread-types';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { buttonThemes } from '../../../components/button.react';
import SWMansionIcon from '../../../SWMansionIcon.react';
import Input from '../../input.react';
import { useModalContext } from '../../modal-provider.react';
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
      setErrorMessage('');
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
      <div>
        <p className={css.confirm_account_password}>
          Please enter your account password to confirm your identity.
        </p>
        <div className={css.form_title}>Account password</div>
        <div className={css.form_content}>
          <Input
            type="password"
            placeholder="Password"
            value={accountPassword}
            onChange={onChangeAccountPassword}
            disabled={threadSettingsOperationInProgress}
            ref={accountPasswordInputRef}
          />
        </div>
      </div>
      <SubmitSection
        errorMessage={errorMessage}
        onClick={onDelete}
        variant="filled"
        buttonColor={buttonThemes.danger}
        disabled={
          threadSettingsOperationInProgress || accountPassword.length === 0
        }
      >
        Delete
      </SubmitSection>
    </form>
  );
}

export default ThreadSettingsDeleteTab;
