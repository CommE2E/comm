// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';

import AddFriendsModal from './add-friends-modal.react.js';
import FriendListRow from './friend-list-row.react.js';
import css from './user-list.css';
import { UserList } from './user-list.react.js';
import PanelHeader from '../../components/panel-header.react.js';
import Panel, { type PanelData } from '../../components/panel.react.js';
import Search from '../../components/search.react.js';

const relationships = [
  userRelationshipStatus.REQUEST_RECEIVED,
  userRelationshipStatus.REQUEST_SENT,
  userRelationshipStatus.FRIEND,
];

function filterUser(userInfo: UserInfo) {
  return relationships.includes(userInfo.relationshipStatus);
}

function usersComparator(user1: AccountUserInfo, user2: AccountUserInfo) {
  if (user1.relationshipStatus === user2.relationshipStatus) {
    return user1.username.localeCompare(user2.username);
  }
  return (
    relationships.indexOf(user1.relationshipStatus) -
    relationships.indexOf(user2.relationshipStatus)
  );
}

function FriendListPanel(): React.Node {
  const [searchText, setSearchText] = React.useState('');

  const { pushModal } = useModalContext();

  const onClickAddFriendsButton = React.useCallback(
    () => pushModal(<AddFriendsModal />),
    [pushModal],
  );

  const friendList = React.useMemo(
    () => (
      <div className={css.container}>
        <div className={css.searchContainer}>
          <Search
            searchText={searchText}
            onChangeText={setSearchText}
            placeholder="Search by name"
          />
        </div>
        <UserList
          userRowComponent={FriendListRow}
          filterUser={filterUser}
          usersComparator={usersComparator}
          searchText={searchText}
        />
      </div>
    ),
    [searchText],
  );

  const panelData: $ReadOnlyArray<PanelData> = React.useMemo(
    () => [
      {
        header: (
          <PanelHeader
            headerLabel="Friend list"
            onClickAddButton={onClickAddFriendsButton}
          />
        ),
        body: friendList,
        classNameOveride: css.panelContainer,
      },
    ],
    [friendList, onClickAddFriendsButton],
  );

  return <Panel panelItems={panelData} />;
}

export default FriendListPanel;
