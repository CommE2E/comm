// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react';
import { createPendingSidebar } from 'lib/shared/thread-utils';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types';
import type { ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { updateNavInfoActionType } from '../redux/action-types';
import type { AppState, CalendarCommunityFilter } from '../redux/redux-setup';
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

const filteredCommunityThreadIDsSelector: (
  state: AppState,
) => ?$ReadOnlySet<string> = createSelector(
  (state: AppState) => state.communityFilter,
  (communityFilter: ?CalendarCommunityFilter): ?Set<string> => {
    if (!communityFilter) {
      return null;
    }
    return new Set(communityFilter.threadIDs);
  },
);

export {
  useOnClickThread,
  useThreadIsActive,
  useOnClickPendingSidebar,
  useOnClickNewThread,
  filteredCommunityThreadIDsSelector,
};
