// @flow

import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import { createSelector } from 'reselect';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react.js';
import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import {
  createPendingSidebar,
  threadInHomeChatList,
} from 'lib/shared/thread-utils.js';
import type {
  ComposableMessageInfo,
  RobotextMessageInfo,
} from 'lib/types/message-types.js';
import type { ThreadInfo, RawThreadInfo } from 'lib/types/thread-types.js';
import { values } from 'lib/utils/objects.js';

import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import { updateNavInfoActionType } from '../redux/action-types.js';
import type { AppState } from '../redux/redux-setup.js';
import { useSelector } from '../redux/redux-utils.js';

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
  const loggedInUserInfo = useLoggedInUserInfo();

  const cacheContext = React.useContext(ENSCacheContext);
  const { getENSNames } = cacheContext;

  return React.useCallback(
    async (event: SyntheticEvent<HTMLElement>) => {
      event.preventDefault();
      if (!loggedInUserInfo) {
        return;
      }
      const pendingSidebarInfo = await createPendingSidebar({
        sourceMessageInfo: messageInfo,
        parentThreadInfo: threadInfo,
        loggedInUserInfo,
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
    [loggedInUserInfo, messageInfo, threadInfo, dispatch, getENSNames],
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

function usePickedCommunityChat(): ?string {
  return useSelector(state => state.pickedCommunityIDs.chat);
}

const unreadCountInSelectedCommunity: (state: AppState) => number =
  createSelector(
    (state: AppState) => state.threadStore.threadInfos,
    (state: AppState) => state.pickedCommunityIDs.chat,
    (
      threadInfos: { +[id: string]: RawThreadInfo },
      communityID: ?string,
    ): number =>
      values(threadInfos).filter(
        threadInfo =>
          threadInHomeChatList(threadInfo) &&
          threadInfo.currentUser.unread &&
          (!communityID || communityID === threadInfo.community),
      ).length,
  );

export {
  useOnClickThread,
  useThreadIsActive,
  useOnClickPendingSidebar,
  useOnClickNewThread,
  usePickedCommunityChat,
  unreadCountInSelectedCommunity,
};
