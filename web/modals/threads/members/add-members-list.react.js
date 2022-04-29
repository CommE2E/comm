// @flow

import _groupBy from 'lodash/fp/groupBy';
import _toPairs from 'lodash/fp/toPairs';
import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types';

import AddMembersItemGroup from './add-members-group.react';

type Props = {
  +userListItems: $ReadOnlyArray<UserListItem>,
  +pendingUsersToAdd: $ReadOnlySet<string>,
  +switchUser: string => void,
};

function AddMembersList(props: Props): React.Node {
  const { userListItems, pendingUsersToAdd, switchUser } = props;

  const usersAvailableToAdd = React.useMemo(
    () => userListItems.filter(user => !user.alertText),
    [userListItems],
  );

  const groupedAvailableUsersList = React.useMemo(
    () => _groupBy(userInfo => userInfo.notice)(usersAvailableToAdd),
    [usersAvailableToAdd],
  );

  const membersInParentThread = React.useMemo(
    () =>
      groupedAvailableUsersList['undefined']
        ? ['Users in parent channel', groupedAvailableUsersList['undefined']]
        : undefined,
    [groupedAvailableUsersList],
  );

  const membersNotInParentThread = React.useMemo(
    () =>
      _toPairs(groupedAvailableUsersList)
        .filter(group => group[0] !== 'undefined')
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([header, users]) => [
          header.charAt(0).toUpperCase() + header.substring(1),
          users,
        ]),
    [groupedAvailableUsersList],
  );

  const usersUnavailableToAdd = React.useMemo(() => {
    const usersUnavailable = userListItems.filter(user => user.alertText);
    if (!usersUnavailable.length) {
      return null;
    }
    return ['Unavailable users', usersUnavailable];
  }, [userListItems]);

  const sortedGroupedUsersList = React.useMemo(
    () =>
      [
        membersInParentThread,
        ...membersNotInParentThread,
        usersUnavailableToAdd,
      ].filter(Boolean),
    [membersInParentThread, membersNotInParentThread, usersUnavailableToAdd],
  );

  return sortedGroupedUsersList.map(([header, userInfos]) => (
    <AddMembersItemGroup
      key={header}
      header={header}
      userInfos={userInfos}
      onUserClick={switchUser}
      usersAdded={pendingUsersToAdd}
    />
  ));
}

export default AddMembersList;
