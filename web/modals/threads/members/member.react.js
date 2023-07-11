// @flow

import classNames from 'classnames';
import * as React from 'react';

import { removeUsersFromThread } from 'lib/actions/thread-actions.js';
import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import {
  removeMemberFromThread,
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

import ChangeMemberRoleModal from './change-member-role-modal.react.js';
import css from './members-modal.css';
import UserAvatar from '../../../avatars/user-avatar.react.js';
import CommIcon from '../../../CommIcon.react.js';
import Label from '../../../components/label.react.js';
import MenuItem from '../../../components/menu-item.react.js';
import Menu from '../../../components/menu.react.js';

type Props = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
  +setOpenMenu: SetState<?string>,
  +isMenuOpen: boolean,
};

function ThreadMember(props: Props): React.Node {
  const { memberInfo, threadInfo, setOpenMenu, isMenuOpen } = props;
  const { pushModal } = useModalContext();
  const userName = stringForUser(memberInfo);
  const { roles } = threadInfo;
  const { role } = memberInfo;

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

  const onClickChangeRole = React.useCallback(() => {
    pushModal(
      <ChangeMemberRoleModal memberInfo={memberInfo} threadInfo={threadInfo} />,
    );
  }, [memberInfo, pushModal, threadInfo]);

  const menuItems = React.useMemo(
    () =>
      getAvailableThreadMemberActions(memberInfo, threadInfo).map(action => {
        if (action === 'change_role') {
          return (
            <MenuItem
              key="change_role"
              text="Change Role"
              iconComponent={<CommIcon size={18} icon="user-edit" />}
              onClick={onClickChangeRole}
            />
          );
        }
        if (action === 'remove_user') {
          return (
            <MenuItem
              key="remove_user"
              text="Remove User"
              icon="logout"
              onClick={onClickRemoveUser}
              dangerous
            />
          );
        }
        return null;
      }),
    [memberInfo, onClickRemoveUser, onClickChangeRole, threadInfo],
  );

  const userSettingsIcon = React.useMemo(
    () => <SWMansionIcon icon="edit-1" size={17} />,
    [],
  );

  const roleName = role && roles[role].name;

  const label = React.useMemo(
    () => <Label variant="grey">{roleName}</Label>,
    [roleName],
  );

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
