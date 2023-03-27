// @flow

import * as React from 'react';

import { getAvatarForUser } from 'lib/shared/avatar-utils.js';
import type { UserListItem } from 'lib/types/user-types.js';

import css from './add-members.css';
import Avatar from '../../components/avatar.react.js';
import Button from '../../components/button.react.js';

type AddMembersItemProps = {
  +userInfo: UserListItem,
  +onClick: (userID: string) => void,
  +userAdded: boolean,
};

function AddMemberItem(props: AddMembersItemProps): React.Node {
  const { userInfo, onClick, userAdded = false } = props;

  const canBeAdded = !userInfo.alertText;

  const onClickCallback = React.useCallback(() => {
    if (!canBeAdded) {
      return;
    }
    onClick(userInfo.id);
  }, [canBeAdded, onClick, userInfo.id]);

  const action = React.useMemo(() => {
    if (!canBeAdded) {
      return userInfo.alertTitle;
    }
    if (userAdded) {
      return <span className={css.danger}>Remove</span>;
    } else {
      return 'Add';
    }
  }, [canBeAdded, userAdded, userInfo.alertTitle]);

  const avatarInfo = React.useMemo(
    () => getAvatarForUser(userInfo),
    [userInfo],
  );

  return (
    <Button
      className={css.addMemberItem}
      onClick={onClickCallback}
      disabled={!canBeAdded}
    >
      <div className={css.userInfoContainer}>
        <Avatar size="small" avatarInfo={avatarInfo} />
        <div className={css.username}>{userInfo.username}</div>
      </div>
      <div className={css.label}>{action}</div>
    </Button>
  );
}

export default AddMemberItem;
