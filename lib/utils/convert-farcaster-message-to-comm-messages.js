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
      .reduce(
        (text, m) => removeMediaURIFromString(text, m.uri),
        farcasterMessage.message,
      )
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
