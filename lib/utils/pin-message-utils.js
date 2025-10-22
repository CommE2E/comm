// @flow

import * as React from 'react';

import { useDispatchActionPromise } from './redux-promise-utils.js';
import { useDispatch, useSelector } from './redux-utils.js';
import { useGetLatestMessageEdit } from '../hooks/latest-message-edit.js';
import {
  useFetchPinnedMessages,
  useToggleMessagePin,
} from '../hooks/message-hooks.js';
import { usePinMessage } from '../shared/farcaster/farcaster-api.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import type { FetchPinnedMessagesResult } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';

function usePinMessageAction(): (
  messageID: string,
  threadID: string,
  action: 'pin' | 'unpin',
) => Promise<void> {
  const keyserverToggleMessagePin = useToggleMessagePin();
  const farcasterPinMessage = usePinMessage();
  const dispatchActionPromise = useDispatchActionPromise();
  const dispatch = useDispatch();
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    async (messageID: string, threadID: string, action: 'pin' | 'unpin') => {
      const threadInfo = threadInfos[threadID];
      await threadSpecs[threadInfo.type].protocol().pinMessage(
        { messageID, threadInfo, action },
        {
          keyserverToggleMessagePin,
          farcasterPinMessage,
          dispatchActionPromise,
          dispatch,
          viewerID,
        },
      );
    },
    [
      keyserverToggleMessagePin,
      farcasterPinMessage,
      dispatchActionPromise,
      dispatch,
      viewerID,
      threadInfos,
    ],
  );
}

function useFetchPinnedMessagesAction(): (
  threadInfo: ThreadInfo,
) => Promise<FetchPinnedMessagesResult> {
  const keyserverFetchPinnedMessages = useFetchPinnedMessages();
  const fetchMessage = useGetLatestMessageEdit();

  return React.useCallback(
    async (threadInfo: ThreadInfo) => {
      return await threadSpecs[threadInfo.type].protocol().fetchPinnedMessages(
        { threadInfo },
        {
          keyserverFetchPinnedMessages,
          fetchMessage,
        },
      );
    },
    [keyserverFetchPinnedMessages, fetchMessage],
  );
}

export { usePinMessageAction, useFetchPinnedMessagesAction };
