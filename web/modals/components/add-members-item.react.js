// @flow

import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types.js';

import css from './add-members.css';
import Button from '../../components/button.react.js';
import UserAvatar from '../../components/user-avatar.react.js';
import { shouldRenderAvatars } from '../../utils/avatar-utils.js';

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

  const usernameStyle = React.useMemo(
    () => ({
      marginLeft: shouldRenderAvatars ? 8 : 0,
    }),
    [],
  );

  return (
    <Button
      className={css.addMemberItem}
      onClick={onClickCallback}
      disabled={!canBeAdded}
    >
      <div className={css.userInfoContainer}>
        <UserAvatar size="small" userID={userInfo.id} />
        <div className={css.username} style={usernameStyle}>
          {userInfo.username}
        </div>
      </div>
      <div className={css.label}>{action}</div>
    </Button>
  );
}

export default AddMemberItem;
