// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './request-access.css';
import SubscriptionForm from './subscription-form.react.js';
import typography from './typography.css';

function RequestAccess(): React.Node {
  const headerClassName = classNames([typography.heading1, css.header]);

  return (
    <section className={css.requestAccessSection}>
      <h1 className={headerClassName}>Request access for our beta today</h1>
      <div className={css.subscriptionform}>
        <SubscriptionForm />
      </div>
      <div className={css.glow} />
    </section>
  );
}

export default RequestAccess;
