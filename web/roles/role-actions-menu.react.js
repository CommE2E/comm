// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

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
  const existingRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].name === roleName,
  );

  const isDeletableRole =
    roleName !== 'Admins' && defaultRoleID !== existingRoleID;
  const isEditableRole = roleName !== 'Admins';

  const openEditRoleModal = React.useCallback(() => {}, []);
  const openDeleteRoleModal = React.useCallback(() => {}, []);

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
