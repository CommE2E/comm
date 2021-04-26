// @flow

import * as React from 'react';

import css from './subscription-form.css';

function SubscriptionForm(): React.Node {
  return (
    <form>
      <input className={css.email_input} placeholder="Enter your email" />
      <button className={css.button}>Subscribe for updates</button>
    </form>
  );
}
export default SubscriptionForm;
