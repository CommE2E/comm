// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  resetPasswordActionTypes,
  resetPassword,
} from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type {
  UpdatePasswordInfo,
  LogInExtraInfo,
  LogInResult,
  LogInStartingPayload,
} from 'lib/types/account-types';
import { verifyField } from 'lib/types/verify-types';
import {
  type DispatchActionPromise,
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils';

import { useSelector } from '../../redux/redux-utils';
import { webLogInExtraInfoSelector } from '../../selectors/account-selectors';
import css from '../../style.css';
import Modal from '../modal.react';

type BaseProps = {|
  +onClose: () => void,
  +onSuccess: () => void,
|};
type Props = {|
  ...BaseProps,
  +resetPasswordUsername: string,
  +verifyCode: ?string,
  +inputDisabled: boolean,
  +logInExtraInfo: () => LogInExtraInfo,
  +dispatchActionPromise: DispatchActionPromise,
  +resetPassword: (info: UpdatePasswordInfo) => Promise<LogInResult>,
|};
type State = {|
  +password: string,
  +confirmPassword: string,
  +errorMessage: string,
|};

class ResetPasswordModal extends React.PureComponent<Props, State> {
  passwordInput: ?HTMLInputElement;

  constructor(props: Props) {
    super(props);
    this.state = {
      password: '',
      confirmPassword: '',
      errorMessage: '',
    };
  }

  componentDidMount() {
    invariant(this.passwordInput, 'passwordInput ref unset');
    this.passwordInput.focus();
  }

  render() {
    return (
      <Modal name="Reset password" onClose={this.props.onClose}>
        <div className={css['modal-body']}>
          <form method="POST">
            <div className={css['form-text']}>
              <div className={css['form-title']}>Username</div>
              <div className={css['form-content']}>
                {this.props.resetPasswordUsername}
              </div>
            </div>
            <div>
              <div className={css['form-title']}>Password</div>
              <div className={css['form-content']}>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={this.state.password}
                    onChange={this.onChangePassword}
                    ref={this.passwordInputRef}
                    disabled={this.props.inputDisabled}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={this.state.confirmPassword}
                    onChange={this.onChangeConfirmPassword}
                    disabled={this.props.inputDisabled}
                  />
                </div>
              </div>
            </div>
            <div className={css['form-footer']}>
              <input
                type="submit"
                value="Update"
                onClick={this.onSubmit}
                disabled={this.props.inputDisabled}
              />
              <div className={css['modal-form-error']}>
                {this.state.errorMessage}
              </div>
            </div>
          </form>
        </div>
      </Modal>
    );
  }

  passwordInputRef = (passwordInput: ?HTMLInputElement) => {
    this.passwordInput = passwordInput;
  };

  onChangePassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ password: target.value });
  };

  onChangeConfirmPassword = (event: SyntheticEvent<HTMLInputElement>) => {
    const target = event.target;
    invariant(target instanceof HTMLInputElement, 'target not input');
    this.setState({ confirmPassword: target.value });
  };

  onSubmit = (event: SyntheticEvent<HTMLInputElement>) => {
    event.preventDefault();

    if (this.state.password === '') {
      this.setState(
        {
          password: '',
          confirmPassword: '',
          errorMessage: 'empty password',
        },
        () => {
          invariant(this.passwordInput, 'passwordInput ref unset');
          this.passwordInput.focus();
        },
      );
      return;
    }
    if (this.state.password !== this.state.confirmPassword) {
      this.setState(
        {
          password: '',
          confirmPassword: '',
          errorMessage: "passwords don't match",
        },
        () => {
          invariant(this.passwordInput, 'passwordInput ref unset');
          this.passwordInput.focus();
        },
      );
      return;
    }

    const extraInfo = this.props.logInExtraInfo();
    this.props.dispatchActionPromise(
      resetPasswordActionTypes,
      this.resetPasswordAction(extraInfo),
      undefined,
      ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
    );
  };

  async resetPasswordAction(extraInfo: LogInExtraInfo) {
    if (!this.props.verifyCode) {
      return;
    }
    try {
      const response = await this.props.resetPassword({
        code: this.props.verifyCode,
        password: this.state.password,
        ...extraInfo,
      });
      this.props.onSuccess();
      return response;
    } catch (e) {
      this.setState(
        {
          password: '',
          confirmPassword: '',
          errorMessage: 'unknown error',
        },
        () => {
          invariant(this.passwordInput, 'passwordInput ref unset');
          this.passwordInput.focus();
        },
      );
      throw e;
    }
  }
}

const loadingStatusSelector = createLoadingStatusSelector(
  resetPasswordActionTypes,
);

export default React.memo<BaseProps>(function ConnectedResetPasswordModal(
  props: BaseProps,
) {
  const resetPasswordUsername = useSelector(
    (state) =>
      state.serverVerificationResult &&
      state.serverVerificationResult.success &&
      state.serverVerificationResult.field === verifyField.RESET_PASSWORD &&
      state.serverVerificationResult.username,
  );
  const verifyCode = useSelector((state) => state.navInfo.verify);
  const inputDisabled = useSelector(
    (state) => loadingStatusSelector(state) === 'loading',
  );
  const logInExtraInfo = useSelector(webLogInExtraInfoSelector);
  const callResetPassword = useServerCall(resetPassword);
  const dispatchActionPromise = useDispatchActionPromise();
  invariant(resetPasswordUsername, 'should have reset password username');

  return (
    <ResetPasswordModal
      {...props}
      resetPasswordUsername={resetPasswordUsername}
      verifyCode={verifyCode}
      inputDisabled={inputDisabled}
      logInExtraInfo={logInExtraInfo}
      resetPassword={callResetPassword}
      dispatchActionPromise={dispatchActionPromise}
    />
  );
});
