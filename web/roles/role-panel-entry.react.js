// @flow

import * as React from 'react';

import css from './role-panel-entry.css';
import CommIcon from '../CommIcon.react.js';

type RolePanelEntryProps = {
  +roleName: string,
  +memberCount: number,
};

function RolePanelEntry(props: RolePanelEntryProps): React.Node {
  const { roleName, memberCount } = props;
  return (
    <div className={css.rolePanelEntry}>
      <div className={css.rolePanelNameEntry}>{roleName}</div>
      <div className={css.rolePanelCountEntryContainer}>
        <div className={css.rolePanelCountEntry}>{memberCount}</div>
        <CommIcon icon="user-filled" size={18} />
      </div>
    </div>
  );
}

export default RolePanelEntry;
