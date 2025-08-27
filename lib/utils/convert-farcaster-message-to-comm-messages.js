// @flow
import uuid from 'uuid';

import type { FarcasterMessage } from '../shared/farcaster/farcaster-messages-types.js';
import { farcasterThreadIDFromConversationID } from '../shared/id-utils.js';
import type { Media } from '../types/media-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { RawMessageInfo } from '../types/message-types.js';

function convertFarcasterMessageToCommMessages(
  farcasterMessage: FarcasterMessage,
): $ReadOnlyArray<RawMessageInfo> {
  const creatorID = `${farcasterMessage.senderFid}`;
  const threadID = farcasterThreadIDFromConversationID(
    farcasterMessage.conversationId,
  );
  if (
    farcasterMessage.type === 'group_membership_addition' &&
    farcasterMessage.actionTargetUserContext?.fid
  ) {
    const addedUser = `${farcasterMessage.actionTargetUserContext.fid}`;
    return [
      {
        id: farcasterMessage.messageId,
        type: messageTypes.ADD_MEMBERS,
        threadID,
        creatorID,
        time: parseInt(farcasterMessage.serverTimestamp, 10),
        addedUserIDs: [addedUser],
      },
    ];
  }

  if (
    farcasterMessage.type === 'text' &&
    !!farcasterMessage?.metadata?.medias
  ) {
    const media = farcasterMessage.metadata.medias.map(
      med =>
        ({
          id: uuid.v4(),
          uri: med.staticRaster,
          type: 'photo',
          thumbHash: null,
          dimensions: {
            height: med.height,
            width: med.width,
          },
        }: Media),
    );
    return [
      {
        id: farcasterMessage.messageId,
        type: messageTypes.MULTIMEDIA,
        threadID,
        creatorID,
        time: parseInt(farcasterMessage.serverTimestamp, 10),
        media,
      },
    ];
  }

  if (farcasterMessage.type === 'text') {
    return [
      {
        id: farcasterMessage.messageId,
        type: messageTypes.TEXT,
        threadID,
        creatorID,
        time: parseInt(farcasterMessage.serverTimestamp, 10),
        text: farcasterMessage.message,
      },
    ];
  }

  if (farcasterMessage.type === 'group_name_change') {
    return [
      {
        id: farcasterMessage.messageId,
        type: messageTypes.CHANGE_SETTINGS,
        threadID,
        creatorID,
        time: parseInt(farcasterMessage.serverTimestamp, 10),
        field: 'name',
        value: farcasterMessage.message,
      },
    ];
  }

  console.log(
    'UNSUPPORTED FARCASTER MESSAGE',
    JSON.stringify(farcasterMessage, null, 2),
  );

  return [];
}

export { convertFarcasterMessageToCommMessages };
