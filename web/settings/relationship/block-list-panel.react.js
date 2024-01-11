// @flow

import * as React from 'react';

import { useModalContext } from 'lib/components/modal-provider.react.js';
import { userRelationshipStatus } from 'lib/types/relationship-types.js';
import type { AccountUserInfo, UserInfo } from 'lib/types/user-types.js';

import BlockListRow from './block-list-row.react.js';
import BlockUsersModal from './block-users-modal.react.js';
import css from './user-list.css';
import { UserList } from './user-list.react.js';
import PanelHeader from '../../components/panel-header.react.js';
import Panel, { type PanelData } from '../../components/panel.react.js';
import Search from '../../components/search.react.js';

const relationships = [
  userRelationshipStatus.BLOCKED_BY_VIEWER,
  userRelationshipStatus.BOTH_BLOCKED,
];

function filterUser(userInfo: UserInfo) {
  return relationships.includes(userInfo.relationshipStatus);
}

function usersComparator(user1: AccountUserInfo, user2: AccountUserInfo) {
  return user1.username.localeCompare(user2.username);
}

function BlockListPanel(): React.Node {
  const [searchText, setSearchText] = React.useState('');

  const { pushModal } = useModalContext();

  const onClickAddBlockedUsersButton = React.useCallback(
    () => pushModal(<BlockUsersModal />),
    [pushModal],
  );

  const blockList = React.useMemo(
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
          userRowComponent={BlockListRow}
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
            headerLabel="Block list"
            onClickAddButton={onClickAddBlockedUsersButton}
          />
        ),
        body: blockList,
        classNameOveride: css.panelContainer,
      },
    ],
    [blockList, onClickAddBlockedUsersButton],
  );

  return <Panel panelItems={panelData} />;
}

export default BlockListPanel;
