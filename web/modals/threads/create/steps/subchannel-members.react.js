// @flow

import * as React from 'react';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './subchannel-members.css';
import Search from '../../../../components/search.react.js';
import AddUsersList from '../../../../settings/relationship/add-users-list.react.js';
import { useSubchannelAddMembersListUserInfos } from '../../../../settings/relationship/add-users-utils.js';

type SubchannelMembersProps = {
  +parentThreadInfo: ThreadInfo,
};

function SubchannelMembers(props: SubchannelMembersProps): React.Node {
  const { parentThreadInfo } = props;

  const [searchUserText, setSearchUserText] = React.useState<string>('');

  const { userInfos, sortedUsersWithENSNames } =
    useSubchannelAddMembersListUserInfos({
      parentThreadID: parentThreadInfo.id,
      searchText: searchUserText,
    });

  return (
    <>
      <div className={css.searchBar}>
        <Search
          searchText={searchUserText}
          onChangeText={setSearchUserText}
          placeholder="Search"
        />
      </div>
      <AddUsersList
        searchModeActive={searchUserText.length > 0}
        userInfos={userInfos}
        sortedUsersWithENSNames={sortedUsersWithENSNames}
      />
    </>
  );
}

export default SubchannelMembers;
