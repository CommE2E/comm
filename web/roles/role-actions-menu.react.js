// @flow

import invariant from 'invariant';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { useRoleDeletableAndEditableStatus } from 'lib/utils/role-utils.js';

import css from './role-actions-menu.css';
import MenuItem from '../components/menu-item.react.js';
import Menu from '../components/menu.react.js';

const menuIcon = <SWMansionIcon icon="menu-horizontal" size={20} />;

type RoleActionsMenuProps = {
  +threadInfo: ThreadInfo,
  +roleName: string,
};

function RoleActionsMenu(props: RoleActionsMenuProps): React.Node {
  const { threadInfo, roleName } = props;

  const defaultRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].isDefault,
  );
  invariant(defaultRoleID, 'default role should exist');

  const existingRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].name === roleName,
  );
  invariant(existingRoleID, 'existing role should exist');

  const roleOptions = useRoleDeletableAndEditableStatus(
    roleName,
    defaultRoleID,
    existingRoleID,
  );

  // TODO: Implement in following diffs
  const openEditRoleModal = React.useCallback(() => {}, []);
  const openDeleteRoleModal = React.useCallback(() => {}, []);

  const menuItems = React.useMemo(() => {
    const availableOptions = [];
    const { isDeletable, isEditable } = roleOptions;

    if (isEditable) {
      availableOptions.push(
        <MenuItem
          key="Edit role"
          text="Edit role"
          icon="edit-1"
          onClick={openEditRoleModal}
          dangerous={false}
        />,
      );
    }

    if (isDeletable) {
      availableOptions.push(
        <MenuItem
          key="Delete role"
          text="Delete role"
          icon="cross-circle"
          onClick={openDeleteRoleModal}
          dangerous={true}
        />,
      );
    }

    return availableOptions;
  }, [roleOptions, openDeleteRoleModal, openEditRoleModal]);

  return (
    <div className={css.menuContainer}>
      <Menu icon={menuIcon} variant="role-actions">
        {menuItems}
      </Menu>
    </div>
  );
}

export default RoleActionsMenu;
