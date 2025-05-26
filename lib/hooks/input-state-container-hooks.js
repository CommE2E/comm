// @flow

import * as React from 'react';

import {
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
} from './message-hooks.js';
import { useMediaMetadataReassignment } from './upload-hooks.js';
import { useProcessBlobHolders } from '../actions/holder-actions.js';
import { useSendComposableDMOperation } from '../shared/dm-ops/process-dm-ops.js';
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
  const sideEffectsFunction =
    useMessageCreationSideEffectsFunc<RawTextMessageInfo>(messageTypes.TEXT);

  return React.useCallback(
    (
      messageInfo: RawTextMessageInfo,
      threadInfo: ThreadInfo,
      parentThreadInfo: ?ThreadInfo,
      sidebarCreation: boolean,
    ) =>
      threadSpecs[threadInfo.type].protocol.sendTextMessage(
        {
          messageInfo,
          threadInfo,
          parentThreadInfo,
          sidebarCreation,
        },
        {
          sendKeyserverTextMessage,
          sendComposableDMOperation,
          sideEffectsFunction,
        },
      ),
    [sendComposableDMOperation, sendKeyserverTextMessage, sideEffectsFunction],
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
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  const reassignThickThreadMedia = useMediaMetadataReassignment();
  const processHolders = useProcessBlobHolders();
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      messageInfo: RawMultimediaMessageInfo,
      sidebarCreation: boolean,
      isLegacy: boolean,
    ) => {
      const threadInfo = threadInfos[messageInfo.threadID];
      return threadSpecs[threadInfo.type].protocol.sendMultimediaMessage(
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
        },
      );
    },
    [
      dispatch,
      legacySendMultimediaMessage,
      processHolders,
      reassignThickThreadMedia,
      sendComposableDMOperation,
      sendMultimediaMessage,
      threadInfos,
    ],
  );
}

export {
  useInputStateContainerSendTextMessage,
  useInputStateContainerSendMultimediaMessage,
};
