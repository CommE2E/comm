// @flow

import * as React from 'react';

import css from './landing.css';

function AppLanding(): React.Node {
  return (
    <div className={css.app_landing_grid}>
      <div className={css.app_preview}>
        <img height={600} src="images/comm-screenshot.png" />
      </div>
      <div className={css.app_copy}>
        <h1>Comm Messenger</h1>
        <p className={css.mono}>Web3 Messenger. E2E encrypted. Blah..</p>
      </div>
    </div>
  );
}

export default AppLanding;
