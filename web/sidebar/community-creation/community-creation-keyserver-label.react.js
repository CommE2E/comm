// @flow

import * as React from 'react';

import css from './community-creation-keyserver-label.css';
import KeyserverPill from '../../components/keyserver-pill.react.js';

function CommunityCreationKeyserverLabel(): React.Node {
  return (
    <div className={css.ancestryContainer}>
      <p>within</p>
      <KeyserverPill keyserverAdminUsername="ashoat" />
    </div>
  );
}

export default CommunityCreationKeyserverLabel;
