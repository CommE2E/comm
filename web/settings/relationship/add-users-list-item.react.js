// @flow

import * as React from 'react';

import type { AccountUserInfo } from 'lib/types/user-types.js';

import css from './add-users-list.css';
import Button from '../../components/button.react.js';

type Props = {
  +userInfo: AccountUserInfo,
  +selectUser: (userID: string) => mixed,
};

function AddUsersListItem(props: Props): React.Node {
  const { userInfo, selectUser } = props;
  const addUser = React.useCallback(
    () => selectUser(userInfo.id),
    [selectUser, userInfo.id],
  );
  return (
    <Button className={css.addUserButton} onClick={addUser}>
      <div className={css.addUserButtonUsername}>{userInfo.username}</div>
      Add
    </Button>
  );
}

export default AddUsersListItem;
