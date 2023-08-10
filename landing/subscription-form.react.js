// @flow

import classNames from 'classnames';
import * as React from 'react';

import { validEmailRegex } from 'lib/shared/account-utils.js';

import css from './subscription-form.css';
import typography from './typography.css';

type SubscriptionFormStatus =
  | { +status: 'pending' }
  | { +status: 'in_progress' }
  | { +status: 'success' }
  | { +status: 'error', +error: string };

function SubscriptionForm(): React.Node {
  const [email, setEmail] = React.useState('');
  const [subscriptionFormStatus, setSubscriptionFormStatus] =
    React.useState<SubscriptionFormStatus>({ status: 'pending' });

  const onEmailSubmitted = React.useCallback(
    async (e: Event) => {
      e.preventDefault();

      if (
        subscriptionFormStatus.status === 'in_progress' ||
        subscriptionFormStatus.status === 'success'
      ) {
        return;
      }
      if (email.search(validEmailRegex) === -1) {
        setSubscriptionFormStatus({ status: 'error', error: 'Invalid email' });
        return;
      }

      setSubscriptionFormStatus({ status: 'in_progress' });
      try {
        const response = await fetch('subscribe_email', {
          method: 'POST',
          credentials: 'same-origin',
          body: JSON.stringify({ email }),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        const respJson = await response.json();
        if (!respJson.success) {
          setSubscriptionFormStatus({
            status: 'error',
            error: 'Request failed',
          });
          return;
        }
        setSubscriptionFormStatus({ status: 'success' });
        document.activeElement?.blur();
      } catch {
        setSubscriptionFormStatus({ status: 'error', error: 'Network failed' });
      }
    },
    [email, subscriptionFormStatus],
  );

  React.useEffect(() => {
    setSubscriptionFormStatus({ status: 'pending' });
  }, [email]);

  let btnText = 'Subscribe for updates';
  let feedbackText = '';
  let btnStyle = css.button;
  let inputStyle = css.emailInput;
  let feedbackTextStyle = css.feedbackText;
  if (subscriptionFormStatus.status === 'error') {
    btnText = subscriptionFormStatus.error;
    feedbackText = `${subscriptionFormStatus.error}, please try again`;
    btnStyle = `${css.button} ${css.buttonFailure}`;
    inputStyle = `${css.emailInput} ${css.emailInputFailure}`;
    feedbackTextStyle = `${css.feedbackText} ${css.feedbackTextFailure}`;
  } else if (subscriptionFormStatus.status === 'success') {
    btnText = 'Subscribed!';
    btnStyle = `${css.button} ${css.buttonSuccess}`;
  }

  const inputClassName = classNames([typography.paragraph2, inputStyle]);
  const buttonClassName = classNames([typography.paragraph2, btnStyle]);
  const feedbackTextClassName = classNames([
    typography.paragraph2,
    feedbackTextStyle,
  ]);

  const onEmailChange = React.useCallback(e => {
    setEmail(e.target.value);
  }, []);

  return (
    <form>
      <div className={css.inputContainer}>
        <input
          type="text"
          id="subscription-form"
          value={email}
          onChange={onEmailChange}
          className={inputClassName}
          placeholder="Enter your email"
        />
        <p className={feedbackTextClassName}>{feedbackText}</p>
      </div>
      <div>
        <button className={buttonClassName} onClick={onEmailSubmitted}>
          {btnText}
        </button>
      </div>
    </form>
  );
}
export default SubscriptionForm;
