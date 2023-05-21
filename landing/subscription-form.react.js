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

  let btnText = 'Request Access';
  let btnStyle = css.button;
  let inputStyle = css.email_input;
  if (subscriptionFormStatus.status === 'error') {
    btnText = subscriptionFormStatus.error;
    btnStyle = `${css.button} ${css.button_failure}`;
    inputStyle = `${css.email_input} ${css.email_input_failure}`;
  } else if (subscriptionFormStatus.status === 'success') {
    btnText = 'Requested!';
    btnStyle = `${css.button} ${css.button_success}`;
  }

  const inputClassName = classNames([typography.paragraph2, inputStyle]);
  const buttonClassName = classNames([typography.paragraph2, btnStyle]);

  const onEmailChange = React.useCallback(e => {
    setEmail(e.target.value);
  }, []);

  return (
    <form>
      <input
        type="text"
        id="subscription-form"
        value={email}
        onChange={onEmailChange}
        className={inputClassName}
        placeholder="Enter your email"
      />
      <button className={buttonClassName} onClick={onEmailSubmitted}>
        {btnText}
      </button>
    </form>
  );
}
export default SubscriptionForm;
