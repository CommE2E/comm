// @flow

import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './community-picker.css';
import SettingsButton from './settings-button.react';

function CommunityPicker(): React.Node {
  return (
    <div className={css.container}>
      <SWMansionIcon icon="inbox" size={28} />
      <div className={css.spacer} />
      <SettingsButton onClick={() => {}}>
        <SWMansionIcon icon="settings" size={16} />
      </SettingsButton>
    </div>
  );
}

export default CommunityPicker;
