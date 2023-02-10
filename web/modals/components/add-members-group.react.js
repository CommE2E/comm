// @flow

import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types.js';

import AddMembersItem from './add-members-item.react.js';
import css from './add-members.css';

type AddMemberItemGroupProps = {
  +header: ?string,
  +userInfos: $ReadOnlyArray<UserListItem>,
  +onUserClick: (userID: string) => void,
  +usersAdded: $ReadOnlySet<string>,
};
function AddMembersItemGroup(props: AddMemberItemGroupProps): React.Node {
  const { userInfos, onUserClick, usersAdded, header } = props;

  const sortedUserInfos = React.useMemo(() => {
    return [...userInfos].sort((a, b) => a.username.localeCompare(b.username));
  }, [userInfos]);

  const userInfosComponents = React.useMemo(
    () =>
      sortedUserInfos.map(userInfo => (
        <AddMembersItem
          key={userInfo.id}
          userInfo={userInfo}
          onClick={onUserClick}
          userAdded={usersAdded.has(userInfo.id)}
        />
      )),
    [onUserClick, sortedUserInfos, usersAdded],
  );
  const headerComponent = header ? (
    <div className={css.addMemberItemsGroupHeader}>{header}:</div>
  ) : null;

  return (
    <>
      {headerComponent}
      {userInfosComponents}
    </>
  );
}

export default AddMembersItemGroup;
