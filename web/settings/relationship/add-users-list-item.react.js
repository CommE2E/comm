// @flow

import classnames from 'classnames';
import * as React from 'react';

import css from './add-users-list.css';
import UserAvatar from '../../avatars/user-avatar.react.js';
import Checkbox from '../../components/checkbox.react.js';

export type BaseAddUserInfo = {
  +id: string,
  +username?: ?string,
  +farcasterUsername?: ?string,
  +isViewer?: ?boolean,
  ...
};

type Props<T: BaseAddUserInfo> = {
  +userInfo: T,
  +userSelected: boolean,
  +onToggleUser: (userID: string) => mixed,
};

function AddUsersListItem<T: BaseAddUserInfo>(props: Props<T>): React.Node {
  const { userInfo, userSelected, onToggleUser } = props;

  const toggleUser = React.useCallback(
    () => onToggleUser(userInfo.id),
    [onToggleUser, userInfo.id],
  );

  const usernameClassname = classnames(css.username, {
    [css.selectedUsername]: userSelected,
  });

  const addUsersListItem = React.useMemo(
    () => (
      <div className={css.userListItemContainer} onClick={toggleUser}>
        <Checkbox checked={userSelected} />
        <div className={css.avatarContainer}>
          <UserAvatar userID={userInfo.id} size="S" />
        </div>
        <div className={usernameClassname}>{userInfo.username}</div>
      </div>
    ),
    [
      toggleUser,
      userSelected,
      userInfo.id,
      userInfo.username,
      usernameClassname,
    ],
  );

  return addUsersListItem;
}

export default AddUsersListItem;
