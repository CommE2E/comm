// @flow

import classnames from 'classnames';
import * as React from 'react';

import type { AccountUserInfo } from 'lib/types/user-types.js';

import css from './add-users-list.css';
import UserAvatar from '../../avatars/user-avatar.react.js';
import Checkbox from '../../components/checkbox.react.js';

type Props = {
  +userInfo: AccountUserInfo,
  +userSelected: boolean,
  +onToggleUser: (userID: string) => mixed,
};

function AddUsersListItem(props: Props): React.Node {
  const { userInfo, userSelected, onToggleUser } = props;

  const toggleUser = React.useCallback(
    () => onToggleUser(userInfo.id),
    [onToggleUser, userInfo.id],
  );

  const usernameClassname = classnames(css.username, {
    [css.selectedUsername]: userSelected,
  });

  return (
    <div className={css.userListItemContainer} onClick={toggleUser}>
      <Checkbox checked={userSelected} />
      <div className={css.avatarContainer}>
        <UserAvatar userID={userInfo.id} size="S" />
      </div>
      <div className={usernameClassname}>{userInfo.username}</div>
    </div>
  );
}

export default AddUsersListItem;
