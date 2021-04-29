// @flow

import * as React from 'react';

import { validEmailRegex } from 'lib/shared/account-utils';

import css from './subscription-form.css';

function SubscriptionForm(): React.Node {
  const [email, setEmail] = React.useState('');
  // eslint-disable-next-line
  const [success, setSuccess] = React.useState(null);
  // eslint-disable-next-line
  const [errorMsg, setErrorMsg] = React.useState(null);

  const onEmailSubmitted = React.useCallback(
    async (e: Event) => {
      e.preventDefault();
      if (email.search(validEmailRegex) === -1) {
        setSuccess(false);
        setErrorMsg('Please enter a valid email address!');
        return;
      }

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
        setSuccess(respJson.success);

        if (!respJson.success) {
          setErrorMsg('Could not add to email list, please try again later!');
        }
      } catch {
        setSuccess(false);
        setErrorMsg('Network request failed, please try again later!');
      }
    },
    [email],
  );

  React.useEffect(() => {
    setSuccess(null);
  }, [email]);

  const onEmailChange = React.useCallback((e) => {
    setEmail(e.target.value);
  }, []);

  return (
    <form>
      <input
        type="text"
        value={email}
        onChange={onEmailChange}
        className={css.email_input}
        placeholder="Enter your email"
      />
      <button className={css.button} onClick={onEmailSubmitted}>
        Subscribe for updates
      </button>
    </form>
  );
}
export default SubscriptionForm;
