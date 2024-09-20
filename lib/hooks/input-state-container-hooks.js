// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import {
  useLegacySendMultimediaMessage,
  useSendMultimediaMessage,
  useSendTextMessage,
} from '../actions/message-actions.js';
import { dmOperationSpecificationTypes } from '../shared/dm-ops/dm-op-utils.js';
import { useSendComposableDMOperation } from '../shared/dm-ops/process-dm-ops.js';
import type {
  RawMultimediaMessageInfo,
  SendMessagePayload,
} from '../types/message-types.js';
import { getMediaMessageServerDBContentsFromMedia } from '../types/messages/media.js';
import type { RawTextMessageInfo } from '../types/messages/text.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import {
  thickThreadTypes,
  threadTypeIsThick,
} from '../types/thread-types-enum.js';
import { useSelector } from '../utils/redux-utils.js';

function useInputStateContainerSendTextMessage(): (
  messageInfo: RawTextMessageInfo,
  threadInfo: ThreadInfo,
  parentThreadInfo: ?ThreadInfo,
  sidebarCreation: boolean,
) => Promise<SendMessagePayload> {
  const sendTextMessage = useSendTextMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();

  return React.useCallback(
    async (
      messageInfo: RawTextMessageInfo,
      threadInfo: ThreadInfo,
      parentThreadInfo: ?ThreadInfo,
      sidebarCreation: boolean,
    ) => {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );
      if (!threadTypeIsThick(threadInfo.type)) {
        const result = await sendTextMessage({
          threadID: messageInfo.threadID,
          localID,
          text: messageInfo.text,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      const messageID = uuid.v4();
      const time = Date.now();

      const recipients =
        threadInfo.type === thickThreadTypes.THICK_SIDEBAR && parentThreadInfo
          ? parentThreadInfo.members
          : threadInfo.members;
      const recipientsIDs = recipients.map(recipient => recipient.id);

      const result = await sendComposableDMOperation({
        type: dmOperationSpecificationTypes.OUTBOUND,
        op: {
          type: 'send_text_message',
          threadID: threadInfo.id,
          creatorID: messageInfo.creatorID,
          time,
          messageID,
          text: messageInfo.text,
        },
        // We need to use a different mechanism than `all_thread_members`
        // because when creating a thread, the thread might not yet
        // be in the store.
        recipients: {
          type: 'some_users',
          userIDs: recipientsIDs,
        },
        sendOnly: true,
        composableMessageID: localID,
      });

      if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
        const e: any = new Error('Failed to send message to all peers');
        e.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw e;
      }
      return {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      };
    },
    [sendComposableDMOperation, sendTextMessage],
  );
}

function useInputStateContainerSendMultimediaMessage(): (
  messageInfo: RawMultimediaMessageInfo,
  sidebarCreation: boolean,
  isLegacy: boolean,
) => Promise<SendMessagePayload> {
  const sendMultimediaMessage = useSendMultimediaMessage();
  const legacySendMultimediaMessage = useLegacySendMultimediaMessage();
  const sendComposableDMOperation = useSendComposableDMOperation();
  const threadInfos = useSelector(state => state.threadStore.threadInfos);

  return React.useCallback(
    async (
      messageInfo: RawMultimediaMessageInfo,
      sidebarCreation: boolean,
      isLegacy: boolean,
    ) => {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
      );

      const threadInfo = threadInfos[messageInfo.threadID];
      const isThickThread = threadInfo && threadTypeIsThick(threadInfo.type);

      if (!isThickThread && isLegacy) {
        const mediaIDs = [];
        for (const { id } of messageInfo.media) {
          mediaIDs.push(id);
        }
        const result = await legacySendMultimediaMessage({
          threadID: messageInfo.threadID,
          localID,
          mediaIDs,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      if (!isThickThread && !isLegacy) {
        const mediaMessageContents = getMediaMessageServerDBContentsFromMedia(
          messageInfo.media,
        );
        const result = await sendMultimediaMessage({
          threadID: messageInfo.threadID,
          localID,
          mediaMessageContents,
          sidebarCreation,
        });
        return {
          localID,
          serverID: result.id,
          threadID: messageInfo.threadID,
          time: result.time,
        };
      }

      const messageID = uuid.v4();
      const time = Date.now();

      const result = await sendComposableDMOperation({
        type: dmOperationSpecificationTypes.OUTBOUND,
        op: {
          type: 'send_multimedia_message',
          threadID: threadInfo.id,
          creatorID: messageInfo.creatorID,
          time: Date.now(),
          messageID,
          media: messageInfo.media,
        },
        recipients: {
          type: 'all_thread_members',
          threadID:
            threadInfo.type === thickThreadTypes.THICK_SIDEBAR &&
            threadInfo.parentThreadID
              ? threadInfo.parentThreadID
              : threadInfo.id,
        },
        sendOnly: true,
        composableMessageID: localID,
      });

      if (result.result === 'failure' && result.failedMessageIDs.length > 0) {
        const e: any = new Error('Failed to send message to all peers');
        e.failedOutboundP2PMessageIDs = result.failedMessageIDs;
        throw e;
      }
      return {
        localID,
        serverID: messageID,
        threadID: messageInfo.threadID,
        time,
      };
    },
    [
      legacySendMultimediaMessage,
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
