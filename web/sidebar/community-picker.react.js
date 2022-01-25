// @flow

import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';

function CommunityPicker(): React.Node {
  return (
    <div className={css.container}>
      <SWMansionIcon icon="inbox" size={28} />
    </div>
  );
}

export default CommunityPicker;
