// @flow

import * as React from 'react';

import Button from '../components/button.react.js';
import css from './danger-zone.css';

function DangerZone(): React.Node {
  return (
    <div className={css.container}>
      <h4 className={css.header}>Danger Zone</h4>
      <h5 className={css.subheading}>Delete Account</h5>
      <Button onClick={() => {}} variant="danger" className={css.button}>
        Delete Account
      </Button>
      <p className={css.explanation}>
        Your account will be permanently deleted. There is no way to reverse
        this.
      </p>
    </div>
  );
}

export default DangerZone;
