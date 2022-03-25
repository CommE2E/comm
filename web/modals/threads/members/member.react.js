// @flow

import {
  faPlusCircle,
  faMinusCircle,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames';
import * as React from 'react';

import {
  memberIsAdmin,
  memberHasAdminPowers,
  threadHasPermission,
} from 'lib/shared/thread-utils';
import { stringForUser } from 'lib/shared/user-utils';
import type { SetState } from 'lib/types/hook-types';
import {
  type RelativeMemberInfo,
  type ThreadInfo,
  threadPermissions,
} from 'lib/types/thread-types';

import Label from '../../../components/label.react';
import MenuItem from '../../../components/menu-item.react';
import Menu from '../../../components/menu.react';
import SWMansionIcon from '../../../SWMansionIcon.react';
import css from './members-modal.css';

type Props = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
  +setOpenMenu: SetState<?string>,
  +isMenuOpen: boolean,
};

function ThreadMember(props: Props): React.Node {
  const { memberInfo, threadInfo, setOpenMenu, isMenuOpen } = props;
  const userName = stringForUser(memberInfo);

  const onMenuChange = React.useCallback(
    menuOpen => {
      if (menuOpen) {
        setOpenMenu(() => memberInfo.id);
      } else {
        setOpenMenu(menu => (menu === memberInfo.id ? null : menu));
      }
    },
    [memberInfo.id, setOpenMenu],
  );

  const menuItems = React.useMemo(() => {
    const { role } = memberInfo;
    if (!role) {
      return [];
    }

    const canRemoveMembers = threadHasPermission(
      threadInfo,
      threadPermissions.REMOVE_MEMBERS,
    );
    const canChangeRoles = threadHasPermission(
      threadInfo,
      threadPermissions.CHANGE_ROLE,
    );

    const actions = [];

    const isAdmin = memberIsAdmin(memberInfo, threadInfo);
    if (canChangeRoles && memberInfo.username && isAdmin) {
      actions.push(
        <MenuItem
          key="remove_admin"
          text="Remove admin"
          icon={faMinusCircle}
        />,
      );
    } else if (canChangeRoles && memberInfo.username) {
      actions.push(
        <MenuItem key="make_admin" text="Make admin" icon={faPlusCircle} />,
      );
    }

    if (
      canRemoveMembers &&
      !memberInfo.isViewer &&
      (canChangeRoles || threadInfo.roles[role]?.isDefault)
    ) {
      actions.push(
        <MenuItem
          key="remove_user"
          text="Remove user"
          icon={faSignOutAlt}
          dangerous
        />,
      );
    }

    return actions;
  }, [memberInfo, threadInfo]);

  const userSettingsIcon = React.useMemo(
    () => <SWMansionIcon icon="edit" size={17} />,
    [],
  );

  const label = React.useMemo(() => {
    if (memberIsAdmin(memberInfo, threadInfo)) {
      return <Label>Admin</Label>;
    } else if (memberHasAdminPowers(memberInfo)) {
      return <Label>Parent admin</Label>;
    }
    return null;
  }, [memberInfo, threadInfo]);

  const memberContainerClasses = classNames(css.memberContainer, {
    [css.memberContainerWithMenuOpen]: isMenuOpen,
  });

  return (
    <div className={memberContainerClasses}>
      <div className={css.memberInfo}>
        {userName} {label}
      </div>
      <div className={css.memberAction}>
        <Menu
          icon={userSettingsIcon}
          variant="member-actions"
          onChange={onMenuChange}
        >
          {menuItems}
        </Menu>
      </div>
    </div>
  );
}

export default ThreadMember;
