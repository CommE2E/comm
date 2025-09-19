// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
} from './message-hooks.js';
import { useMediaMetadataReassignment } from './upload-hooks.js';
import { useProcessBlobHolders } from '../actions/holder-actions.js';
import { useSendComposableDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import { useSendFarcasterTextMessage } from '../shared/farcaster/farcaster-api.js';
import { useFetchConversation } from '../shared/farcaster/farcaster-hooks.js';
import { useMessageCreationSideEffectsFunc } from '../shared/message-utils.js';
import { threadSpecs } from '../shared/threads/thread-specs.js';
import { messageTypes } from '../types/message-types-enum.js';
import type {
  RawMultimediaMessageInfo,
  SendMessagePayload,
  SendMultimediaMessagePayload,
} from '../types/message-types.js';
import type { RawTextMessageInfo } from '../types/messages/text.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector, useDispatch } from '../utils/redux-utils.js';

function useInputStateContainerSendTextMessage(): (
  messageInfo: RawTextMessageInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  sidebarCreation: boolean,
) => Promise<SendMessagePayload> {
  const sendKeyserverTextMessage = useSendTextMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();
  const sendFarcasterTextMessage = useSendFarcasterTextMessage();
  const sideEffectsFunction =
    useMessageCreationSideEffectsFunc<RawTextMessageInfo>(messageTypes.TEXT);
  const auxUserStore = useSelector(state => state.auxUserStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const farcasterFetchConversation = useFetchConversation();
  const rawThreadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    (
      messageInfo: RawTextMessageInfo,
      threadInfo: ThreadInfo,
      parentThreadInfo: ?ThreadInfo,
      sidebarCreation: boolean,
    ) => {
      invariant(viewerID, 'Viewer ID should be present');
      return threadSpecs[threadInfo.type].protocol().sendTextMessage(
        {
          messageInfo,
          threadInfo,
          parentThreadInfo,
          sidebarCreation,
        },
        {
          sendKeyserverTextMessage,
          sendComposableDMOperation,
          sendFarcasterTextMessage,
          viewerID,
          sideEffectsFunction,
          auxUserStore,
          farcasterFetchConversation,
          rawThreadInfos,
        },
      );
    },
    [
      sendKeyserverTextMessage,
      sendComposableDMOperation,
      sendFarcasterTextMessage,
      viewerID,
      sideEffectsFunction,
      auxUserStore,
      farcasterFetchConversation,
      rawThreadInfos,
    ],
  );
}

function useInputStateContainerSendMultimediaMessage(): (
  messageInfo: RawMultimediaMessageInfo,
  sidebarCreation: boolean,
  isLegacy: boolean,
) => Promise<SendMultimediaMessagePayload> {
  const sendMultimediaMessage = useSendMultimediaMessage();
  const legacySendMultimediaMessage = useLegacySendMultimediaMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();
  const rawThreadInfos = useSelector(state => state.threadStore.threadInfos);

  const reassignThickThreadMedia = useMediaMetadataReassignment();
  const processHolders = useProcessBlobHolders();
  const dispatch = useDispatch();

  const sendFarcasterTextMessage = useSendFarcasterTextMessage();

  const auxUserStore = useSelector(state => state.auxUserStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const farcasterFetchConversation = useFetchConversation();

  return React.useCallback(
    async (
      messageInfo: RawMultimediaMessageInfo,
      sidebarCreation: boolean,
      isLegacy: boolean,
    ) => {
      const threadInfo = rawThreadInfos[messageInfo.threadID];
      invariant(viewerID, 'Viewer ID should be present');
      return threadSpecs[threadInfo.type].protocol().sendMultimediaMessage(
        {
          messageInfo,
          sidebarCreation,
          isLegacy,
          threadInfo,
        },
        {
          sendKeyserverMultimediaMessage: sendMultimediaMessage,
          legacyKeyserverSendMultimediaMessage: legacySendMultimediaMessage,
          sendComposableDMOperation,
          reassignThickThreadMedia,
          processHolders,
          dispatch,
          viewerID,
          sendFarcasterTextMessage,
          auxUserStore,
          farcasterFetchConversation,
          rawThreadInfos,
        },
      );
    },
    [
      rawThreadInfos,
      sendMultimediaMessage,
      legacySendMultimediaMessage,
      sendComposableDMOperation,
      reassignThickThreadMedia,
      processHolders,
      dispatch,
      viewerID,
      sendFarcasterTextMessage,
      auxUserStore,
      farcasterFetchConversation,
    ],
  );
}

export {
  useInputStateContainerSendTextMessage,
  useInputStateContainerSendMultimediaMessage,
};
