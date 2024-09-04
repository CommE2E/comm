// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { searchUsers as searchUserCall } from '../actions/user-actions.js';
import { useLegacyAshoatKeyserverCall } from '../keyserver-conn/legacy-keyserver-call.js';
import { useGlobalThreadSearchIndex } from '../selectors/nav-selectors.js';
import { usersWithPersonalThreadSelector } from '../selectors/user-selectors.js';
import {
  type OutboundDMOperationSpecification,
  dmOperationSpecificationTypes,
} from '../shared/dm-ops/dm-op-utils.js';
import { useProcessAndSendDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import {
  useForwardLookupSearchText,
  useSearchUsers,
} from '../shared/search-utils.js';
import type {
  DMCreateSidebarOperation,
  DMCreateThreadOperation,
} from '../types/dm-ops';
import { threadTypes } from '../types/thread-types-enum.js';
import type { NewThickThreadRequest } from '../types/thread-types.js';
import type { GlobalAccountUserInfo } from '../types/user-types.js';
import { useSelector } from '../utils/redux-utils.js';
import { usingCommServicesAccessToken } from '../utils/services-utils.js';

type ThreadListSearchResult = {
  +threadSearchResults: $ReadOnlySet<string>,
  +usersSearchResults: $ReadOnlyArray<GlobalAccountUserInfo>,
};

function useThreadListSearch(
  searchText: string,
  viewerID: ?string,
): ThreadListSearchResult {
  const usersWithPersonalThread = useSelector(usersWithPersonalThreadSelector);
  const forwardLookupSearchText = useForwardLookupSearchText(searchText);

  const filterAndSetUserResults = React.useCallback(
    (userInfos: $ReadOnlyArray<GlobalAccountUserInfo>) => {
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
      filterAndSetUserResults(userInfos);
    },
    [filterAndSetUserResults, legacyCallSearchUsers],
  );

  const [threadSearchResults, setThreadSearchResults] = React.useState(
    new Set<string>(),
  );
  const [usersSearchResults, setUsersSearchResults] = React.useState<
    $ReadOnlyArray<GlobalAccountUserInfo>,
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

  const identitySearchUsers = useSearchUsers(forwardLookupSearchText);
  React.useEffect(() => {
    if (usingCommServicesAccessToken) {
      filterAndSetUserResults(identitySearchUsers);
    }
  }, [filterAndSetUserResults, identitySearchUsers]);

  return { threadSearchResults, usersSearchResults };
}

function useNewThickThread(): (
  input: NewThickThreadRequest,
) => Promise<string> {
  const processAndSendDMOperation = useProcessAndSendDMOperation();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );

  return React.useCallback(
    async (input: NewThickThreadRequest) => {
      invariant(viewerID, 'viewerID must be defined');
      const threadID = input.id ?? uuid.v4();

      let op;
      if (input.type === threadTypes.THICK_SIDEBAR) {
        const { parentThreadID, sourceMessageID, initialMemberIDs } = input;
        invariant(
          parentThreadID,
          'parentThreadID has to be defined for thick sidebar',
        );
        const sidebarOP: DMCreateSidebarOperation = {
          creatorID: viewerID,
          memberIDs: initialMemberIDs ?? [],
          newCreateSidebarMessageID: uuid.v4(),
          newSidebarSourceMessageID: uuid.v4(),
          parentThreadID: parentThreadID,
          roleID: uuid.v4(),
          sourceMessageID: sourceMessageID,
          threadID,
          time: Date.now(),
          type: 'create_sidebar',
        };
        op = sidebarOP;
      } else {
        const { type, initialMemberIDs } = input;

        const threadOP: DMCreateThreadOperation = {
          creatorID: viewerID,
          memberIDs: initialMemberIDs ?? [],
          newMessageID: uuid.v4(),
          roleID: uuid.v4(),
          threadID,
          threadType: type,
          time: Date.now(),
          type: 'create_thread',
        };
        op = threadOP;
      }
      const userIDs = [...(input.initialMemberIDs ?? []), viewerID];
      const opSpecification: OutboundDMOperationSpecification = {
        type: dmOperationSpecificationTypes.OUTBOUND,
        op,
        recipients: {
          type: 'some_users',
          userIDs,
        },
      };
      await processAndSendDMOperation(opSpecification);
      return threadID;
    },
    [processAndSendDMOperation, viewerID],
  );
}

export { useThreadListSearch, useNewThickThread };
