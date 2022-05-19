// @flow

import * as React from 'react';

import css from './danger-zone.css';

function DangerZone(): React.Node {
  return (
    <div className={css.container}>
      <h4 className={css.header}>Danger Zone</h4>
    </div>
  );
}

export default DangerZone;
