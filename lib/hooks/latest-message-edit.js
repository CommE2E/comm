// @flow

import * as React from 'react';

import { messageTypes } from '../types/message-types-enum.js';
import type { RawMessageInfo, MessageStore } from '../types/message-types.js';
import { getConfig } from '../utils/config.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../utils/message-ops-utils.js';
import { useSelector } from '../utils/redux-utils.js';

function useGetLatestMessageEdit(): (
  messageID: string,
) => Promise<?RawMessageInfo> {
  const messageStore = useSelector(state => state.messageStore);
  const baseGetLatestMessageEdit = useBaseGetLatestMessageEdit();
  return React.useCallback(
    (messageID: string) => baseGetLatestMessageEdit(messageID, messageStore),
    [baseGetLatestMessageEdit, messageStore],
  );
}

function useBaseGetLatestMessageEdit(): (
  messageID: string,
  messageStore: MessageStore,
) => Promise<?RawMessageInfo> {
  const { getRelatedMessages } = getConfig().sqliteAPI;
  return React.useCallback(
    async (messageID: string, messageStore: MessageStore) => {
      const relatedDBMessages = await getRelatedMessages(messageID);
      const relatedMessages = relatedDBMessages.map(
        translateClientDBMessageInfoToRawMessageInfo,
      );

      // First, get the original message, which should be the last
      // since the results are sorted on time
      const originalMessage = relatedMessages.pop();
      if (!originalMessage) {
        // It is possible that this message isn't yet present in the DB but is
        // already present in Redux store
        const messageFromRedux = messageStore.messages[messageID];
        if (!messageFromRedux) {
          return undefined;
        }
        // Edits are only supported for text messages
        if (messageFromRedux.type !== messageTypes.TEXT) {
          return messageFromRedux;
        }
        for (const threadMessageID of messageStore.threads[
          messageFromRedux.threadID
        ].messageIDs) {
          const message = messageStore.messages[threadMessageID];
          if (
            message.type === messageTypes.EDIT_MESSAGE &&
            message.targetMessageID === messageID
          ) {
            return {
              ...messageFromRedux,
              text: message.text,
            };
          }
        }
        return messageFromRedux;
      }

      if (originalMessage.id !== messageID) {
        console.log('last related message is not original message');
        return undefined;
      }

      // Edits are only supported for text messages
      if (originalMessage.type !== messageTypes.TEXT) {
        return originalMessage;
      }

      // Next, get the latest edit, if there is one
      let editedOriginalMessage = originalMessage;
      for (const relatedMessage of relatedMessages) {
        if (relatedMessage.type !== messageTypes.EDIT_MESSAGE) {
          continue;
        }
        editedOriginalMessage = {
          ...originalMessage,
          text: relatedMessage.text,
        };
        break;
      }

      return editedOriginalMessage;
    },
    [getRelatedMessages],
  );
}

export { useGetLatestMessageEdit, useBaseGetLatestMessageEdit };
