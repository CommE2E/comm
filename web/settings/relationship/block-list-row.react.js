// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useRelationshipCallbacks } from 'lib/hooks/relationship-prompt.js';
import { getAvatarForUser } from 'lib/shared/avatar-utils.js';

import css from './user-list-row.css';
import type { UserRowProps } from './user-list.react.js';
import Avatar from '../../components/avatar.react.js';
import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';

function BlockListRow(props: UserRowProps): React.Node {
  const { userInfo, onMenuVisibilityChange } = props;
  const { unblockUser } = useRelationshipCallbacks(userInfo.id);
  const editIcon = <SWMansionIcon icon="edit-1" size={22} />;

  const avatarInfo = React.useMemo(
    () => getAvatarForUser(userInfo),
    [userInfo],
  );

  return (
    <div className={css.container}>
      <div className={css.userInfoContainer}>
        <Avatar size="small" avatarInfo={avatarInfo} />
        <div className={css.usernameContainer}>{userInfo.username}</div>
      </div>
      <div className={css.buttons}>
        <div className={css.edit_menu}>
          <Menu
            onChange={onMenuVisibilityChange}
            icon={editIcon}
            variant="member-actions"
          >
            <MenuItem text="Unblock" icon="user-plus" onClick={unblockUser} />
          </Menu>
        </div>
      </div>
    </div>
  );
}

export default BlockListRow;
