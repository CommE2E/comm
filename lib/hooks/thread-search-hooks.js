// @flow

import * as React from 'react';

import { useUsersSupportThickThreads } from './user-identities-hooks.js';
import { useGlobalThreadSearchIndex } from '../components/global-search-index-provider.react.js';
import { usersWithPersonalThreadSelector } from '../selectors/user-selectors.js';
import {
  useForwardLookupSearchText,
  useSearchUsers,
} from '../shared/search-utils.js';
import { useOldestPrivateThreadInfo } from '../shared/thread-utils.js';
import type { GlobalAccountUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';

export type UserSearchResult = $ReadOnly<{
  ...GlobalAccountUserInfo,
  +supportThickThreads: boolean,
}>;

type ThreadListSearchResult = {
  +threadSearchResults: $ReadOnlySet<string>,
  +usersSearchResults: $ReadOnlyArray<UserSearchResult>,
};

const searchUsersOptions = { includeViewer: true };

function useThreadListSearch(
  searchText: string,
  viewerID: ?string,
): ThreadListSearchResult {
  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);
  const forwardLookupSearchText = useForwardLookupSearchText(searchText);
  const oldestPrivateThreadInfo = useOldestPrivateThreadInfo();

  const filterAndSetUserResults = React.useCallback(
    (userInfos: $ReadOnlyArray<UserSearchResult>) => {
      const usersResults = userInfos.filter(
        info =>
          !usersWithPersonalThread.has(info.id) &&
          (info.id !== viewerID || !oldestPrivateThreadInfo),
      );
      setUsersSearchResults(usersResults);
    },
    [usersWithPersonalThread, viewerID, oldestPrivateThreadInfo],
  );

  const [threadSearchResults, setThreadSearchResults] = React.useState(
    new Set<string>(),
  );
  const [usersSearchResults, setUsersSearchResults] = React.useState<
    $ReadOnlyArray<UserSearchResult>,
  >([]);
  const threadSearchIndex = useGlobalThreadSearchIndex();
  React.useEffect(() => {
    void (async () => {
      const results = threadSearchIndex.getSearchResults(searchText);
      setThreadSearchResults(new Set<string>(results));
    })();
  }, [searchText, forwardLookupSearchText, threadSearchIndex]);

  const usersSupportThickThreads = useUsersSupportThickThreads();
  const identitySearchUsers = useSearchUsers(
    forwardLookupSearchText,
    searchUsersOptions,
  );
  React.useEffect(() => {
    void (async () => {
      const userIDsSupportingThickThreads = await usersSupportThickThreads(
        identitySearchUsers.map(user => user.id),
      );
      filterAndSetUserResults(
        identitySearchUsers.map(search => ({
          ...search,
          supportThickThreads: !!userIDsSupportingThickThreads.get(search.id),
        })),
      );
    })();
  }, [filterAndSetUserResults, identitySearchUsers, usersSupportThickThreads]);

  return { threadSearchResults, usersSearchResults };
}

export { useThreadListSearch };
