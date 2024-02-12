// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './thread-settings-delete-tab.css';

function ThreadSettingsDeleteTab(): React.Node {
  return (
    <div className={css.warning_container}>
      <SWMansionIcon
        icon="warning-circle"
        className={css.warning_icon}
        size={26}
      />
      <p className={css.deletion_warning}>
        Your chat will be permanently deleted. There is no way to reverse this.
      </p>
    </div>
  );
}

export default ThreadSettingsDeleteTab;
