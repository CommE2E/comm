// @flow

import * as React from 'react';

import css from './community-creation-keyserver-label.css';
import CommIcon from '../../CommIcon.react.js';

function CommunityCreationKeyserverLabel(): React.Node {
  return (
    <div className={css.ancestryContainer}>
      <p>within</p>
      <div className={css.keyserverContainer}>
        <CommIcon icon="cloud-filled" size={18} color="white" />
        <div className={css.keyserverName}>ashoat</div>
      </div>
    </div>
  );
}

export default CommunityCreationKeyserverLabel;
