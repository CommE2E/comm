// @flow

import {
  faEraser,
  faUserMinus,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useResetRatchetState } from 'lib/hooks/peer-list-hooks.js';
import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { useIsCurrentUserStaff } from 'lib/shared/staff-utils.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import { isDev } from 'lib/utils/dev-utils.js';

import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';

const menuIcon = <SWMansionIcon icon="menu-vertical" size={24} />;

const unfriendIcon = <FontAwesomeIcon icon={faUserMinus} />;

const blockIcon = <FontAwesomeIcon icon={faUserShield} />;

const unblockIcon = <FontAwesomeIcon icon={faUserShield} />;

const resetIcon = <FontAwesomeIcon icon={faEraser} />;

type Props = {
  +threadInfo: ThreadInfo,
};

function UserProfileMenu(props: Props): React.Node {
  const { threadInfo } = props;

  const isCurrentUserStaff = useIsCurrentUserStaff();

  const {
    otherUserInfo,
    callbacks: { unfriendUser, blockUser, unblockUser },
  } = useRelationshipPrompt(threadInfo);

  const unfriendMenuIcon = React.useMemo(
    () => (
      <MenuItem
        key="unfriend"
        text="Remove friend"
        iconComponent={unfriendIcon}
        onClick={unfriendUser}
      />
    ),
    [unfriendUser],
  );

  const blockMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="block"
        text="Block user"
        dangerous
        iconComponent={blockIcon}
        onClick={blockUser}
      />
    ),
    [blockUser],
  );

  const unblockMenuItem = React.useMemo(
    () => (
      <MenuItem
        key="unblock"
        text="Unblock user"
        iconComponent={unblockIcon}
        onClick={unblockUser}
      />
    ),
    [unblockUser],
  );

  const reset = useResetRatchetState();
  const resetRatchetStateAction = React.useCallback(
    async () => reset(otherUserInfo?.id),
    [otherUserInfo?.id, reset],
  );
  const resetRatchetState = React.useMemo(
    () => (
      <MenuItem
        key="reset"
        text="Reset ratchet"
        dangerous
        iconComponent={resetIcon}
        onClick={resetRatchetStateAction}
      />
    ),
    [resetRatchetStateAction],
  );

  const menuItems = React.useMemo(() => {
    const items = [];
    if (otherUserInfo?.relationshipStatus === userRelationshipStatus.FRIEND) {
      items.push(unfriendMenuIcon);
      items.push(blockMenuItem);
    } else if (
      otherUserInfo?.relationshipStatus ===
        userRelationshipStatus.BOTH_BLOCKED ||
      otherUserInfo?.relationshipStatus ===
        userRelationshipStatus.BLOCKED_BY_VIEWER
    ) {
      items.push(unblockMenuItem);
    } else {
      items.push(blockMenuItem);
    }

    if (isCurrentUserStaff || isDev) {
      items.push(resetRatchetState);
    }

    return items;
  }, [
    blockMenuItem,
    isCurrentUserStaff,
    otherUserInfo?.relationshipStatus,
    resetRatchetState,
    unblockMenuItem,
    unfriendMenuIcon,
  ]);

  const userProfileMenu = React.useMemo(() => {
    if (!otherUserInfo) {
      return null;
    }

    return (
      <Menu variant="user-profile" icon={menuIcon}>
        {menuItems}
      </Menu>
    );
  }, [menuItems, otherUserInfo]);

  return userProfileMenu;
}

export default UserProfileMenu;
