// @flow
import uuid from 'uuid';

import type { FCUserInfos } from '../hooks/user-identities-hooks.js';
import type { FarcasterMessage } from '../shared/farcaster/farcaster-messages-types.js';
import {
  farcasterThreadIDFromConversationID,
  userIDFromFID,
} from '../shared/id-utils.js';
import type { Media } from '../types/media-types.js';
import { messageTypes } from '../types/message-types-enum.js';
import type { RawMessageInfo } from '../types/message-types.js';
import type { CompoundReactionInfo } from '../types/messages/compound-reaction.js';

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
  const result: Array<RawMessageInfo> = [];

  if (farcasterMessage.reactions?.length > 0) {
    const viewerReactions = new Set(
      farcasterMessage.viewerContext?.reactions ?? [],
    );
    const reactions: { [reaction: string]: CompoundReactionInfo } = {};
    for (const reaction of farcasterMessage.reactions) {
      reactions[reaction.reaction] = {
        count: reaction.count,
        viewerReacted: viewerReactions.has(reaction.reaction),
      };
    }
    result.push({
      id: `${farcasterMessage.messageId}/reactions`,
      type: messageTypes.COMPOUND_REACTION,
      threadID,
      creatorID, // Doesn't matter - we don't use it
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      targetMessageID: farcasterMessage.messageId,
      reactions,
    });
  }

  if (
    farcasterMessage.type === 'group_membership_addition' &&
    farcasterMessage.actionTargetUserContext?.fid
  ) {
    const addedUserFID =
      farcasterMessage.actionTargetUserContext.fid.toString();
    const addedUser =
      fcUserInfos.get(addedUserFID)?.userID ?? userIDFromFID(addedUserFID);
    result.push({
      id: farcasterMessage.messageId,
      type: messageTypes.ADD_MEMBERS,
      threadID,
      creatorID,
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      addedUserIDs: [addedUser],
    });
  } else if (
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
    result.push({
      id: farcasterMessage.messageId,
      type: messageTypes.MULTIMEDIA,
      threadID,
      creatorID,
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      media,
    });
  } else if (farcasterMessage.type === 'text') {
    result.push({
      id: farcasterMessage.messageId,
      type: messageTypes.TEXT,
      threadID,
      creatorID,
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      text: farcasterMessage.message,
    });
  } else if (farcasterMessage.type === 'group_name_change') {
    result.push({
      id: farcasterMessage.messageId,
      type: messageTypes.CHANGE_SETTINGS,
      threadID,
      creatorID,
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      field: 'name',
      value: farcasterMessage.message,
    });
  } else if (
    farcasterMessage.type === 'group_membership_removal' &&
    farcasterMessage.actionTargetUserContext?.fid
  ) {
    const removedUserFID =
      farcasterMessage.actionTargetUserContext.fid.toString();
    const removedUserID =
      fcUserInfos?.get(removedUserFID)?.userID ?? userIDFromFID(removedUserFID);

    result.push({
      type: messageTypes.REMOVE_MEMBERS,
      id: farcasterMessage.messageId,
      threadID,
      creatorID,
      time: parseInt(farcasterMessage.serverTimestamp, 10),
      removedUserIDs: [removedUserID],
    });
  } else {
    console.log(
      'UNSUPPORTED FARCASTER MESSAGE',
      JSON.stringify(farcasterMessage, null, 2),
    );
  }

  return result;
}

export { convertFarcasterMessageToCommMessages };
