// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useRemoveUsersFromThread } from 'lib/hooks/thread-hooks.js';
import { removeMemberFromThread } from 'lib/shared/thread-actions-utils.js';
import { useAvailableThreadMemberActions } from 'lib/shared/thread-utils.js';
import { stringForUser } from 'lib/shared/user-utils.js';
import type { SetState } from 'lib/types/hook-types.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { useRolesFromCommunityThreadInfo } from 'lib/utils/role-utils.js';

import ChangeMemberRoleModal from './change-member-role-modal.react.js';
import css from './members-modal.css';
import UserAvatar from '../../../avatars/user-avatar.react.js';
import CommIcon from '../../../comm-icon.react.js';
import Label from '../../../components/label.react.js';
import MenuItem from '../../../components/menu-item.react.js';
import Menu from '../../../components/menu.react.js';
import { usePushUserProfileModal } from '../../user-profile/user-profile-utils.js';

const commIconComponent = <CommIcon size={18} icon="user-edit" />;

type Props = {
  +memberInfo: RelativeMemberInfo,
  +threadInfo: ThreadInfo,
  +setOpenMenu: SetState<?string>,
};

function ThreadMember(props: Props): React.Node {
  const { memberInfo, threadInfo, setOpenMenu } = props;
  const { pushModal } = useModalContext();
  const userName = stringForUser(memberInfo);

  const memberInfos = React.useMemo(() => [memberInfo], [memberInfo]);
  const roles = useRolesFromCommunityThreadInfo(threadInfo, memberInfos);
  const roleName = roles.get(memberInfo.id)?.name;

  const onMenuChange = React.useCallback(
    (menuOpen: boolean) => {
      if (menuOpen) {
        setOpenMenu(() => memberInfo.id);
      } else {
        setOpenMenu(menu => (menu === memberInfo.id ? null : menu));
      }
    },
    [memberInfo.id, setOpenMenu],
  );

  const dispatchActionPromise = useDispatchActionPromise();
  const boundRemoveUsersFromThread = useRemoveUsersFromThread();

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

  const availableThreadMemberActions = useAvailableThreadMemberActions(
    memberInfo,
    threadInfo,
  );

  const menuItems = React.useMemo(
    () =>
      availableThreadMemberActions.map(action => {
        if (action === 'change_role') {
          return (
            <MenuItem
              key="change_role"
              text="Change Role"
              iconComponent={commIconComponent}
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
    [onClickRemoveUser, onClickChangeRole, availableThreadMemberActions],
  );

  const userSettingsIcon = React.useMemo(
    () => <SWMansionIcon icon="edit-1" size={17} />,
    [],
  );

  const label = React.useMemo(
    () => <Label variant="grey">{roleName}</Label>,
    [roleName],
  );

  const pushUserProfileModal = usePushUserProfileModal(memberInfo.id);

  return (
    <div className={css.memberContainer} onClick={pushUserProfileModal}>
      <div className={css.memberInfo}>
        <UserAvatar size="S" userID={memberInfo.id} />
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
