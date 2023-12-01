// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import RoleActionsMenu from './role-actions-menu.react.js';
import css from './role-panel-entry.css';
import CommIcon from '../CommIcon.react.js';

type RolePanelEntryProps = {
  +threadInfo: ThreadInfo,
  +roleName: string,
  +memberCount: number,
};

function RolePanelEntry(props: RolePanelEntryProps): React.Node {
  const { threadInfo, roleName, memberCount } = props;
  return (
    <div className={css.rolePanelEntry}>
      <div className={css.rolePanelNameEntry}>{roleName}</div>
      <div className={css.rolePanelCountEntryContainer}>
        <div className={css.rolePanelCountAndIcon}>
          <div className={css.rolePanelCountEntry}>{memberCount}</div>
          <CommIcon icon="user-filled" size={18} />
        </div>
        <RoleActionsMenu threadInfo={threadInfo} roleName={roleName} />
      </div>
    </div>
  );
}

export default RolePanelEntry;
