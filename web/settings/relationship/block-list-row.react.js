// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useRelationshipCallbacks } from 'lib/hooks/relationship-prompt.js';

import css from './user-list-row.css';
import type { UserRowProps } from './user-list.react.js';
import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';
import UserAvatar from '../../components/user-avatar.react.js';
import { shouldRenderAvatars } from '../../utils/avatar-utils.js';

function BlockListRow(props: UserRowProps): React.Node {
  const { userInfo, onMenuVisibilityChange } = props;
  const { unblockUser } = useRelationshipCallbacks(userInfo.id);
  const editIcon = <SWMansionIcon icon="edit-1" size={22} />;

  const usernameContainerStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  return (
    <div className={css.container}>
      <div className={css.userInfoContainer}>
        <UserAvatar size="small" userID={userInfo.id} />
        <div className={css.usernameContainer} style={usernameContainerStyle}>
          {userInfo.username}
        </div>
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
