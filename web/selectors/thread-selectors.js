// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { createPendingSidebar } from 'lib/shared/thread-utils';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo, RawThreadInfo } from 'lib/types/thread-types';
import { values } from 'lib/utils/objects';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { updateNavInfoActionType } from '../redux/action-types';
import type { AppState } from '../redux/redux-setup';
import { useSelector } from '../redux/redux-utils';

function useOnClickThread(
  thread: ?ThreadInfo,
): (event: SyntheticEvent<HTMLElement>) => void {
  const dispatch = useDispatch();
  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      invariant(
        thread?.id,
        'useOnClickThread should be called with threadID set',
      );
      event.preventDefault();
      const { id: threadID } = thread;

      let payload;
      if (threadID.includes('pending')) {
        payload = {
          chatMode: 'view',
          activeChatThreadID: threadID,
          pendingThread: thread,
          tab: 'chat',
        };
      } else {
        payload = {
          chatMode: 'view',
          activeChatThreadID: threadID,
          tab: 'chat',
        };
      }

      dispatch({ type: updateNavInfoActionType, payload });
    },
    [dispatch, thread],
  );
}

function useThreadIsActive(threadID: string): boolean {
  return useSelector(state => threadID === state.navInfo.activeChatThreadID);
}

function useOnClickPendingSidebar(
  messageInfo: ComposableMessageInfo | RobotextMessageInfo,
  threadInfo: ThreadInfo,
): (event: SyntheticEvent<HTMLElement>) => mixed {
  const dispatch = useDispatch();
  const viewerID = useSelector(state => state.currentUserInfo?.id);

  const cacheContext = React.useContext(ENSCacheContext);
  const { getENSNames } = cacheContext;

  return React.useCallback(
    async (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (!viewerID) {
        return;
      }
      const pendingSidebarInfo = await createPendingSidebar({
        sourceMessageInfo: messageInfo,
        parentThreadInfo: threadInfo,
        viewerID,
        markdownRules: getDefaultTextMessageRules().simpleMarkdownRules,
        getENSNames,
      });
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          activeChatThreadID: pendingSidebarInfo.id,
          pendingThread: pendingSidebarInfo,
        },
      });
    },
    [viewerID, messageInfo, threadInfo, dispatch, getENSNames],
  );
}

function useOnClickNewThread(): (event: SyntheticEvent<HTMLElement>) => void {
  const dispatch = useDispatch();
  return React.useCallback(
    (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      dispatch({
        type: updateNavInfoActionType,
        payload: {
          chatMode: 'create',
          selectedUserList: [],
        },
      });
    },
    [dispatch],
  );
}

function filteredCommunityThreadIDs(
  communityID: string,
  threadInfosObj: { +[id: string]: ThreadInfo | RawThreadInfo },
): $ReadOnlySet<string> {
  const threadInfos = values(threadInfosObj);
  const threadIDs = threadInfos
    .filter(
      thread => thread.community === communityID || thread.id === communityID,
    )
    .map(item => item.id);
  return new Set(threadIDs);
}

const filteredCommunityThreadIDsSelector: (
  state: AppState,
) => ?$ReadOnlySet<string> = createSelector(
  (state: AppState) => state.communityIDFilter,
  threadInfoSelector,
  (communityIDFilter: ?string, threadInfos: { +[id: string]: ThreadInfo }) => {
    if (!communityIDFilter) {
      return null;
    }
    return filteredCommunityThreadIDs(communityIDFilter, threadInfos);
  },
);

function useCommunityIsPicked(communityID: string): boolean {
  const communityIDFilter = useSelector(state => state.communityIDFilter);
  return communityID === communityIDFilter;
}

export {
  useOnClickThread,
  useThreadIsActive,
  useOnClickPendingSidebar,
  useOnClickNewThread,
  filteredCommunityThreadIDsSelector,
  filteredCommunityThreadIDs,
  useCommunityIsPicked,
};
