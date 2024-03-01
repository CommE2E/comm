// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import {
  roleIsDefaultRole,
  useRoleUserSurfacedPermissions,
} from 'lib/shared/thread-utils.js';
import type {
  RoleInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { values } from 'lib/utils/objects.js';
import { useRoleDeletableAndEditableStatus } from 'lib/utils/role-utils.js';

import CreateRolesModal from './create-roles-modal.react.js';
import DeleteRoleModal from './delete-role-modal.react.js';
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
  const { pushModal } = useModalContext();

  const defaultRoleID = Object.keys(threadInfo.roles).find(roleID =>
    roleIsDefaultRole(threadInfo.roles[roleID]),
  );
  invariant(defaultRoleID, 'default role should exist');

  const existingRole = values(threadInfo.roles).find(
    (role: RoleInfo) => role.name === roleName,
  );
  invariant(existingRole, 'existing role should exist');

  const roleOptions = useRoleDeletableAndEditableStatus(
    roleName,
    defaultRoleID,
    existingRole.id,
  );

  const roleNamesToUserSurfacedPermissions =
    useRoleUserSurfacedPermissions(threadInfo);

  const openEditRoleModal = React.useCallback(
    () =>
      pushModal(
        <CreateRolesModal
          threadInfo={threadInfo}
          action="edit_role"
          existingRoleID={existingRole.id}
          roleName={roleName}
          rolePermissions={roleNamesToUserSurfacedPermissions[roleName]}
        />,
      ),
    [
      existingRole.id,
      pushModal,
      roleName,
      roleNamesToUserSurfacedPermissions,
      threadInfo,
    ],
  );
  const openDeleteRoleModal = React.useCallback(() => {
    pushModal(
      <DeleteRoleModal
        threadInfo={threadInfo}
        defaultRoleID={defaultRoleID}
        roleID={existingRole.id}
      />,
    );
  }, [pushModal, threadInfo, defaultRoleID, existingRole.id]);

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
