// @flow

import { faUserMinus, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useRelationshipPrompt } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { ThreadInfo } from 'lib/types/thread-types';

import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';

const menuIcon = <SWMansionIcon icon="menu-vertical" size={24} />;

const unfriendIcon = <FontAwesomeIcon icon={faUserMinus} />;

const blockIcon = <FontAwesomeIcon icon={faUserShield} />;

const unblockIcon = <FontAwesomeIcon icon={faUserShield} />;

type Props = {
  +threadInfo: ThreadInfo,
};

function UserProfileMenu(props: Props): React.Node {
  const { threadInfo } = props;

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

    return items;
  }, [
    blockMenuItem,
    otherUserInfo?.relationshipStatus,
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
