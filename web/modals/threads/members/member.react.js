// @flow

import classNames from 'classnames';
import * as React from 'react';

import {
  removeUsersFromThread,
  changeThreadMemberRoles,
} from 'lib/actions/thread-actions.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  memberIsAdmin,
  memberHasAdminPowers,
  removeMemberFromThread,
  switchMemberAdminRoleInThread,
  getAvailableThreadMemberActions,
} from 'lib/shared/thread-utils.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import {
  type RelativeMemberInfo,
  type ThreadInfo,
} from 'lib/types/thread-types.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import css from './members-modal.css';
import Label from '../../../components/label.react.js';
import MenuItem from '../../../components/menu-item.react.js';
import Menu from '../../../components/menu.react.js';
import UserAvatar from '../../../components/user-avatar.react.js';

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

  const dispatchActionPromise = useDispatchActionPromise();
  const boundRemoveUsersFromThread = useServerCall(removeUsersFromThread);

  const onClickRemoveUser = React.useCallback(
    () =>
      removeMemberFromThread(
        threadInfo,
        memberInfo,
        dispatchActionPromise,
        boundRemoveUsersFromThread,
      ),
    [boundRemoveUsersFromThread, dispatchActionPromise, memberInfo, threadInfo],
  );

  const isCurrentlyAdmin = memberIsAdmin(memberInfo, threadInfo);
  const boundChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);

  const onMemberAdminRoleToggled = React.useCallback(
    () =>
      switchMemberAdminRoleInThread(
        threadInfo,
        memberInfo,
        isCurrentlyAdmin,
        dispatchActionPromise,
        boundChangeThreadMemberRoles,
      ),
    [
      boundChangeThreadMemberRoles,
      dispatchActionPromise,
      isCurrentlyAdmin,
      memberInfo,
      threadInfo,
    ],
  );

  const menuItems = React.useMemo(
    () =>
      getAvailableThreadMemberActions(memberInfo, threadInfo).map(action => {
        if (action === 'remove_admin') {
          return (
            <MenuItem
              key="remove_admin"
              text="Remove admin"
              icon="cross-circle"
              onClick={onMemberAdminRoleToggled}
            />
          );
        }
        if (action === 'make_admin') {
          return (
            <MenuItem
              key="make_admin"
              text="Make admin"
              icon="plus-circle"
              onClick={onMemberAdminRoleToggled}
            />
          );
        }
        if (action === 'remove_user') {
          return (
            <MenuItem
              key="remove_user"
              text="Remove user"
              icon="logout"
              onClick={onClickRemoveUser}
              dangerous
            />
          );
        }
        return null;
      }),
    [memberInfo, onClickRemoveUser, onMemberAdminRoleToggled, threadInfo],
  );

  const userSettingsIcon = React.useMemo(
    () => <SWMansionIcon icon="edit-1" size={17} />,
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
        <UserAvatar size="small" userID={memberInfo.id} />
        {userName}
        {label}
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
