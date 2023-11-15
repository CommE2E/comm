// @flow

import * as React from 'react';

import css from './keyserver-pill.css';
import CommIcon from '../CommIcon.react.js';

type Props = {
  +keyserverAdminUsername: string,
};

function KeyserverPill(props: Props): React.Node {
  const { keyserverAdminUsername } = props;

  return (
    <div className={css.keyserverContainer}>
      <CommIcon icon="cloud-filled" size={18} className={css.keyserverIcon} />
      <div className={css.keyserverName}>{keyserverAdminUsername}</div>
    </div>
  );
}

export default KeyserverPill;
