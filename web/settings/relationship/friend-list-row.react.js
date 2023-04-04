// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';
import { useRelationshipCallbacks } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';

import css from './user-list-row.css';
import type { UserRowProps } from './user-list.react.js';
import Button from '../../components/button.react.js';
import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';
import UserAvatar from '../../components/user-avatar.react.js';
import { shouldRenderAvatars } from '../../utils/avatar-utils.js';

const dangerButtonColor = {
  color: 'var(--btn-bg-danger)',
};

function FriendListRow(props: UserRowProps): React.Node {
  const { userInfo, onMenuVisibilityChange } = props;

  const { friendUser, unfriendUser } = useRelationshipCallbacks(userInfo.id);
  const buttons = React.useMemo(() => {
    if (userInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT) {
      return (
        <Button
          variant="text"
          className={css.button}
          buttonColor={dangerButtonColor}
          onClick={unfriendUser}
        >
          Cancel request
        </Button>
      );
    }
    if (
      userInfo.relationshipStatus === userRelationshipStatus.REQUEST_RECEIVED
    ) {
      return (
        <>
          <Button variant="text" className={css.button} onClick={friendUser}>
            Accept
          </Button>
          <Button
            variant="text"
            className={css.button}
            buttonColor={dangerButtonColor}
            onClick={unfriendUser}
          >
            Reject
          </Button>
        </>
      );
    }
    if (userInfo.relationshipStatus === userRelationshipStatus.FRIEND) {
      const editIcon = <SWMansionIcon icon="edit-1" size={22} />;
      return (
        <div className={css.edit_menu}>
          <Menu
            onChange={onMenuVisibilityChange}
            icon={editIcon}
            variant="member-actions"
          >
            <MenuItem
              text="Unfriend"
              icon="user-cross"
              onClick={unfriendUser}
            />
          </Menu>
        </div>
      );
    }
    return undefined;
  }, [
    friendUser,
    unfriendUser,
    userInfo.relationshipStatus,
    onMenuVisibilityChange,
  ]);

  const usernameContainerStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  return (
    <div className={css.container}>
      <div className={css.userInfoContainer}>
        <UserAvatar size="small" userID={userInfo.id} />
        <div className={css.usernameContainer} style={usernameContainerStyle}>
          {userInfo.username}
        </div>
      </div>
      <div className={css.buttons}>{buttons}</div>
    </div>
  );
}

export default FriendListRow;
