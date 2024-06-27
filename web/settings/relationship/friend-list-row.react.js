// @flow

import * as React from 'react';

import SWMansionIcon from 'lib/components/swmansion-icon.react.js';
import { useRelationshipCallbacks } from 'lib/hooks/relationship-prompt.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';

import css from './user-list-row.css';
import type { UserRowProps } from './user-list.react.js';
import UserAvatar from '../../avatars/user-avatar.react.js';
import Button from '../../components/button.react.js';
import MenuItem from '../../components/menu-item.react.js';
import Menu from '../../components/menu.react.js';
import { usePushUserProfileModal } from '../../modals/user-profile/user-profile-utils.js';

const dangerButtonColor = {
  color: 'var(--btn-bg-danger)',
};

function FriendListRow(props: UserRowProps): React.Node {
  const { userInfo, onMenuVisibilityChange } = props;

  const {
    callbacks: { friendUser, unfriendUser },
  } = useRelationshipCallbacks(userInfo.id);

  const friendUserCallback = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
      friendUser();
    },
    [friendUser],
  );

  const unfriendUserCallback = React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
      unfriendUser();
    },
    [unfriendUser],
  );

  const buttons = React.useMemo(() => {
    if (userInfo.relationshipStatus === userRelationshipStatus.REQUEST_SENT) {
      return (
        <Button
          variant="text"
          className={css.button}
          buttonColor={dangerButtonColor}
          onClick={unfriendUserCallback}
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
          <Button
            variant="text"
            className={css.button}
            onClick={friendUserCallback}
          >
            Accept
          </Button>
          <Button
            variant="text"
            className={css.button}
            buttonColor={dangerButtonColor}
            onClick={unfriendUserCallback}
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
    userInfo.relationshipStatus,
    unfriendUserCallback,
    friendUserCallback,
    onMenuVisibilityChange,
    unfriendUser,
  ]);

  const pushUserProfileModal = usePushUserProfileModal(userInfo.id);

  return (
    <div className={css.container} onClick={pushUserProfileModal}>
      <div className={css.userInfoContainer}>
        <UserAvatar size="S" userID={userInfo.id} />
        <div className={css.usernameContainer}>{userInfo.username}</div>
      </div>
      <div className={css.buttons}>{buttons}</div>
    </div>
  );
}

export default FriendListRow;
