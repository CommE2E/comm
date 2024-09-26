// @flow

import * as React from 'react';

import { useUsersSupportThickThreads } from './user-identities-hooks.js';
import { searchUsers as searchUserCall } from '../actions/user-actions.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import { useGlobalThreadSearchIndex } from '../selectors/nav-selectors.js';
import { usersWithPersonalThreadSelector } from '../selectors/user-selectors.js';
import {
  useForwardLookupSearchText,
  useSearchUsers,
} from '../shared/search-utils.js';
import type { GlobalAccountUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

export type UserSearchResult = $ReadOnly<{
  ...GlobalAccountUserInfo,
  +supportThickThreads: boolean,
}>;

type ThreadListSearchResult = {
  +threadSearchResults: $ReadOnlySet<string>,
  +usersSearchResults: $ReadOnlyArray<UserSearchResult>,
};

function useThreadListSearch(
  searchText: string,
  viewerID: ?string,
): ThreadListSearchResult {
  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);
  const forwardLookupSearchText = useForwardLookupSearchText(searchText);

  const filterAndSetUserResults = React.useCallback(
    (userInfos: $ReadOnlyArray<UserSearchResult>) => {
      const usersResults = userInfos.filter(
        info => !usersWithPersonalThread.has(info.id) && info.id !== viewerID,
      );
      setUsersSearchResults(usersResults);
    },
    [usersWithPersonalThread, viewerID],
  );

  const legacyCallSearchUsers = useLegacyAshoatKeyserverCall(searchUserCall);
  const legacySearchUsers = React.useCallback(
    async (usernamePrefix: string) => {
      if (usernamePrefix.length === 0) {
        filterAndSetUserResults([]);
        return;
      }

      const { userInfos } = await legacyCallSearchUsers(usernamePrefix);
      filterAndSetUserResults(
        userInfos.map(userInfo => ({
          ...userInfo,
          supportThickThreads: false,
        })),
      );
    },
    [filterAndSetUserResults, legacyCallSearchUsers],
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
      if (!usingCommServicesAccessToken) {
        await legacySearchUsers(forwardLookupSearchText);
      }
    })();
  }, [
    searchText,
    forwardLookupSearchText,
    threadSearchIndex,
    legacySearchUsers,
  ]);

  const usersSupportThickThreads = useUsersSupportThickThreads();
  const identitySearchUsers = useSearchUsers(forwardLookupSearchText);
  React.useEffect(() => {
    void (async () => {
      if (!usingCommServicesAccessToken) {
        return;
      }

      const userIDsSupportingThickThreads = await usersSupportThickThreads(
        identitySearchUsers.map(user => user.id),
      );
      filterAndSetUserResults(
        identitySearchUsers.map(search => ({
          ...search,
          supportThickThreads: userIDsSupportingThickThreads.has(search.id),
        })),
      );
    })();
  }, [filterAndSetUserResults, identitySearchUsers, usersSupportThickThreads]);

  return { threadSearchResults, usersSearchResults };
}

export { useThreadListSearch };
