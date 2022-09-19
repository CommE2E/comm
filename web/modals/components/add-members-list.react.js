// @flow

import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types';

import AddMembersItemGroup from './add-members-group.react';

type MemberGroupItem = {
  +header: ?string,
  +userInfos: $ReadOnlyArray<UserListItem>,
};

type Props = {
  +switchUser: string => void,
  +pendingUsersToAdd: $ReadOnlySet<string>,
  +sortedGroupedUsersList: $ReadOnlyArray<MemberGroupItem>,
};

function AddMembersList(props: Props): React.Node {
  const { switchUser, pendingUsersToAdd, sortedGroupedUsersList } = props;

  const addMembersList = React.useMemo(
    () =>
      sortedGroupedUsersList.map(({ header, userInfos }) => (
        <AddMembersItemGroup
          key={header}
          header={header}
          userInfos={userInfos}
          onUserClick={switchUser}
          usersAdded={pendingUsersToAdd}
        />
      )),
    [sortedGroupedUsersList, switchUser, pendingUsersToAdd],
  );

  return addMembersList;
}

export default AddMembersList;
