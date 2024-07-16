// @flow

import * as React from 'react';

import { messageTypes } from '../types/message-types-enum.js';
import type { RawMessageInfo } from '../types/message-types.js';
import { getConfig } from '../utils/config.js';
import { translateClientDBMessageInfoToRawMessageInfo } from '../utils/message-ops-utils.js';

function useGetLatestMessageEdit(): (
  messageID: string,
) => Promise<?RawMessageInfo> {
  const { getRelatedMessages } = getConfig().sqliteAPI;
  return React.useCallback(
    async (messageID: string) => {
      const relatedDBMessages = await getRelatedMessages(messageID);
      const relatedMessages = relatedDBMessages.map(
        translateClientDBMessageInfoToRawMessageInfo,
      );

      // First, get the original message, which should be the last
      // since the results are sorted on time
      const originalMessage = relatedMessages.pop();
      if (!originalMessage) {
        return undefined;
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

export { useGetLatestMessageEdit };
