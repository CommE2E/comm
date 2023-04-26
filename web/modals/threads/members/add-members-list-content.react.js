// @flow

import _groupBy from 'lodash/fp/groupBy.js';
import _toPairs from 'lodash/fp/toPairs.js';
import * as React from 'react';

import type { UserListItem } from 'lib/types/user-types.js';

import AddMembersList from '../../components/add-members-list.react.js';

type Props = {
  +userListItems: $ReadOnlyArray<UserListItem>,
  +pendingUsersToAdd: $ReadOnlySet<string>,
  +switchUser: string => void,
  +hasParentThread: boolean,
};

function AddMembersListContent(props: Props): React.Node {
  const { userListItems, pendingUsersToAdd, switchUser, hasParentThread } =
    props;

  const usersAvailableToAdd = React.useMemo(
    () => userListItems.filter(user => !user.alertText),
    [userListItems],
  );

  const groupedAvailableUsersList = React.useMemo(
    () => _groupBy(userInfo => userInfo.notice)(usersAvailableToAdd),
    [usersAvailableToAdd],
  );

  const membersInParentThread = React.useMemo(() => {
    if (!groupedAvailableUsersList['undefined']) {
      return null;
    }
    const label = hasParentThread ? 'Users in parent channel' : null;
    return [label, groupedAvailableUsersList['undefined']];
  }, [groupedAvailableUsersList, hasParentThread]);

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
      ]
        .filter(Boolean)
        .map(([header, userInfos]) => ({ header, userInfos })),
    [membersInParentThread, membersNotInParentThread, usersUnavailableToAdd],
  );

  return (
    <AddMembersList
      switchUser={switchUser}
      pendingUsersToAdd={pendingUsersToAdd}
      sortedGroupedUsersList={sortedGroupedUsersList}
    />
  );
}

export default AddMembersListContent;
