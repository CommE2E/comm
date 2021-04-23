// @flow

import * as React from 'react';

import css from './subscribe-btn.css';

function SubscribeButton(): React.Node {
  return (
    <a href="https://www.squadcal.org">
      <button className={css.button}>Subscribe for updates</button>
    </a>
  );
}
export default SubscribeButton;
