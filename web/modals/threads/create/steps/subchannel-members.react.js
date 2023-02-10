// @flow

import * as React from 'react';
import { useSelector } from 'react-redux';

import { userStoreSearchIndex } from 'lib/selectors/user-selectors.js';
import { useAncestorThreads } from 'lib/shared/ancestor-threads.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import Search from '../../../../components/search.react.js';
import MembersList from './subchannel-members-list.react.js';
import css from './subchannel-members.css';

type SubchannelMembersProps = {
  +parentThreadInfo: ThreadInfo,
  +selectedUsers: $ReadOnlySet<string>,
  +searchText: string,
  +setSearchText: string => void,
  +toggleUserSelection: (userID: string) => void,
};

function SubchannelMembers(props: SubchannelMembersProps): React.Node {
  const {
    toggleUserSelection,
    searchText,
    setSearchText,
    parentThreadInfo,
    selectedUsers,
  } = props;

  const ancestorThreads = useAncestorThreads(parentThreadInfo);

  const communityThread = ancestorThreads[0] ?? parentThreadInfo;

  const userSearchIndex = useSelector(userStoreSearchIndex);
  const searchResult = React.useMemo(
    () => new Set(userSearchIndex.getSearchResults(searchText)),
    [userSearchIndex, searchText],
  );

  return (
    <>
      <div className={css.searchBar}>
        <Search
          searchText={searchText}
          onChangeText={setSearchText}
          placeholder="Search"
        />
      </div>
      <div className={css.members}>
        <MembersList
          communityThreadInfo={communityThread}
          parentThreadInfo={parentThreadInfo}
          selectedUsers={selectedUsers}
          searchResult={searchResult}
          searchText={searchText}
          toggleUserSelection={toggleUserSelection}
        />
      </div>
    </>
  );
}

export default SubchannelMembers;
