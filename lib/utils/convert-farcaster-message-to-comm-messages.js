// @flow
import uuid from 'uuid';

import { makeFarcasterBlobMediaURI } from './blob-service.js';
import type { FCUserInfos } from '../hooks/user-identities-hooks.js';
import type { FarcasterMessage } from '../shared/farcaster/farcaster-messages-types.js';
import {
  farcasterThreadIDFromConversationID,
  userIDFromFID,
} from '../shared/id-utils.js';
import type { Image, Video } from '../types/media-types.js';
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
      // Doesn't matter - we don't use it
      creatorID,
      // We add 1 to the timestamp to make sure that the reactions are more
      // recent than the message itself
      time: parseInt(farcasterMessage.serverTimestamp, 10) + 1,
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
    (!!farcasterMessage?.metadata?.medias ||
      !!farcasterMessage?.metadata?.videos)
  ) {
    const media: Array<Image | Video> =
      farcasterMessage.metadata.medias?.map(
        med =>
          ({
            id: uuid.v4(),
            uri: med.staticRaster,
            type: 'photo',
            thumbHash: findThumbHash(med.staticRaster),
            dimensions: {
              height: med.height,
              width: med.width,
            },
          }: Image),
      ) || [];

    for (const video of farcasterMessage.metadata?.videos ?? []) {
      media.push(
        ({
          type: 'video',
          id: uuid.v4(),
          uri: video.url,
          thumbnailID: uuid.v4(),
          thumbnailURI: video.thumbnailUrl,
          thumbnailThumbHash: null,
          loop: false,
          dimensions: {
            width: video.width,
            height: video.height,
          },
        }: Video),
      );
    }

    const time = parseInt(farcasterMessage.serverTimestamp, 10);
    result.push({
      id: farcasterMessage.messageId,
      type: messageTypes.MULTIMEDIA,
      threadID,
      creatorID,
      time,
      media,
    });

    const captionText = media
      .reduce(
        (text, m) => removeMediaURIFromString(text, m.uri),
        farcasterMessage.message,
      )
      .trim();

    if (captionText.length > 0) {
      result.push({
        id: farcasterMessage.messageId + '/caption',
        type: messageTypes.TEXT,
        threadID,
        creatorID,
        time: time + 1,
        text: captionText,
      });
    }
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

function removeMediaURIFromString(input: string, url: string): string {
  // Message contents contain original URL of what is mirrored on Blob.
  // We retrieve it here to remove it from message text.
  const blobMediaBasePath = makeFarcasterBlobMediaURI('');
  const urlencodedOriginal = url.replaceAll(blobMediaBasePath, '');
  const mirrorOriginalUrl = decodeURIComponent(urlencodedOriginal);
  console.log({
    input,
    url,
    blobMediaBasePath,
    urlencodedOriginal,
    mirrorOriginalUrl,
  });

  return input.replaceAll(url, '').replaceAll(mirrorOriginalUrl, '');
}

const thumbHashRegex = /thumbHash=(.+)($|&)/;

function findThumbHash(url: string): ?string {
  const matchResult = url.match(thumbHashRegex);
  if (!matchResult || matchResult.length < 2) {
    return null;
  }

  // decode base64-url and unescape padding
  return matchResult[1]
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .replaceAll('%3D', '=');
}

export { convertFarcasterMessageToCommMessages };
