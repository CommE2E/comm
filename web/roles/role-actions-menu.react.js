// @flow

import invariant from 'invariant';
import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useRoleUserSurfacedPermissions } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

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

  const defaultRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].isDefault,
  );
  invariant(defaultRoleID, 'default role should exist');
  const existingRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].name === roleName,
  );
  invariant(existingRoleID, 'existing role should exist');

  const isDeletableRole =
    roleName !== 'Admins' && defaultRoleID !== existingRoleID;
  const isEditableRole = roleName !== 'Admins';

  const roleNamesToUserSurfacedPermissions =
    useRoleUserSurfacedPermissions(threadInfo);

  const openEditRoleModal = React.useCallback(
    () =>
      pushModal(
        <CreateRolesModal
          threadInfo={threadInfo}
          action="edit_role"
          existingRoleID={existingRoleID}
          roleName={roleName}
          rolePermissions={roleNamesToUserSurfacedPermissions[roleName]}
        />,
      ),
    [
      existingRoleID,
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
        roleID={existingRoleID}
      />,
    );
  }, [existingRoleID, pushModal, threadInfo, defaultRoleID]);

  const items = React.useMemo(() => {
    const availableOptions = [];

    if (isEditableRole) {
      availableOptions.push({
        text: 'Edit role',
        icon: 'edit-1',
        onClick: openEditRoleModal,
        dangerous: false,
      });
    }

    if (isDeletableRole) {
      availableOptions.push({
        text: 'Delete role',
        icon: 'cross-circle',
        onClick: openDeleteRoleModal,
        dangerous: true,
      });
    }
    return availableOptions;
  }, [isDeletableRole, isEditableRole, openDeleteRoleModal, openEditRoleModal]);

  const roleMenuItems = React.useMemo(
    () =>
      items.map(item => (
        <MenuItem
          key={item.text}
          text={item.text}
          icon={item.icon}
          onClick={item.onClick}
          dangerous={item.dangerous}
        />
      )),
    [items],
  );

  return (
    <div className={css.menuContainer}>
      <Menu icon={menuIcon} variant="role-actions">
        {roleMenuItems}
      </Menu>
    </div>
  );
}

export default RoleActionsMenu;
