// @flow

import * as React from 'react';

import css from './landing.css';

function Support(): React.Node {
  return (
    <div className={css.legal_container}>
      <h1>Support</h1>

      <p>
        If you have any feedback, questions, or concerns, you can reach us at{' '}
        <a href="mailto:support@comm.app">support@comm.app</a>.
      </p>
    </div>
  );
}

export default Support;
