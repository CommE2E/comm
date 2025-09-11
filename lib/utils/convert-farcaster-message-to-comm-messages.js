// @flow
import uuid from 'uuid';

import type { FCUserInfos } from '../hooks/user-identities-hooks.js';
import type { FarcasterMessage } from '../shared/farcaster/farcaster-messages-types.js';
import {
  farcasterThreadIDFromConversationID,
  userIDFromFID,
} from '../shared/id-utils.js';
import type { Image } from '../types/media-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { RawMessageInfo } from '../types/message-types.js';

function convertFarcasterMessageToCommMessages(
  farcasterMessage: FarcasterMessage,
  fcUserInfos: FCUserInfos,
): $ReadOnlyArray<RawMessageInfo> {
  const senderFid = farcasterMessage.senderFid.toString();
  const creatorID =
    fcUserInfos.get(senderFid)?.userID ?? userIDFromFID(senderFid);

  const threadID = farcasterThreadIDFromConversationID(
    farcasterMessage.conversationId,
  );
  if (
    farcasterMessage.type === 'group_membership_addition' &&
    farcasterMessage.actionTargetUserContext?.fid
  ) {
    const addedUserFID =
      farcasterMessage.actionTargetUserContext.fid.toString();
    const addedUser =
      fcUserInfos.get(addedUserFID)?.userID ?? userIDFromFID(addedUserFID);
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
        }: Image),
    );

    const time = parseInt(farcasterMessage.serverTimestamp, 10);
    const messages: Array<RawMessageInfo> = [
      {
        id: farcasterMessage.messageId,
        type: messageTypes.MULTIMEDIA,
        threadID,
        creatorID,
        time,
        media,
      },
    ];

    const captionText = media
      .reduce((text, m) => text.replaceAll(m.uri, ''), farcasterMessage.message)
      .trim();

    if (captionText.length > 0) {
      messages.push({
        id: farcasterMessage.messageId + '/caption',
        type: messageTypes.TEXT,
        threadID,
        creatorID,
        time,
        text: captionText,
      });
    }

    return messages;
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

  if (
    farcasterMessage.type === 'group_membership_removal' &&
    farcasterMessage.actionTargetUserContext?.fid
  ) {
    const removedUserFID =
      farcasterMessage.actionTargetUserContext.fid.toString();
    const removedUserID =
      fcUserInfos?.get(removedUserFID)?.userID ?? userIDFromFID(removedUserFID);

    return [
      {
        type: messageTypes.REMOVE_MEMBERS,
        id: farcasterMessage.messageId,
        threadID,
        creatorID,
        time: parseInt(farcasterMessage.serverTimestamp, 10),
        removedUserIDs: [removedUserID],
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
