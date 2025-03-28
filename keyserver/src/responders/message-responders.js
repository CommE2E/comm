// @flow

import invariant from 'invariant';
import t, { type TInterface, type TUnion } from 'tcomb';

import { onlyOneEmojiRegex } from 'lib/shared/emojis.js';
import {
  createMediaMessageData,
  trimMessage,
} from 'lib/shared/message-utils.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import type { Media } from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type SendTextMessageRequest,
  type SendMultimediaMessageRequest,
  type SendReactionMessageRequest,
  type SendEditMessageRequest,
  type FetchMessageInfosResponse,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendMessageResponse,
  type SendEditMessageResponse,
  type FetchPinnedMessagesRequest,
  type FetchPinnedMessagesResult,
  type SearchMessagesResponse,
  type SearchMessagesKeyserverRequest,
  type DeleteMessageRequest,
  type DeleteMessageResponse,
  isComposableMessageType,
} from 'lib/types/message-types.js';
import type { DeleteMessageData } from 'lib/types/messages/delete.js';
import type { EditMessageData } from 'lib/types/messages/edit.js';
import type { ReactionMessageData } from 'lib/types/messages/reaction.js';
import type { TextMessageData } from 'lib/types/messages/text.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import {
  tRegex,
  tShape,
  tMediaMessageMedia,
  tID,
} from 'lib/utils/validation-utils.js';

import createMessages from '../creators/message-creator.js';
import {
  fetchMessageInfos,
  fetchMessageInfoForLocalID,
  fetchMessageInfoByID,
  fetchThreadMessagesCount,
  fetchPinnedMessageInfos,
  searchMessagesInSingleChat,
} from '../fetchers/message-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import {
  checkThreadPermission,
  checkThreadsOr,
} from '../fetchers/thread-permission-fetchers.js';
import {
  fetchUnassignedImages,
  fetchUnassignedMediaFromMediaMessageContent,
} from '../fetchers/upload-fetchers.js';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  assignImages,
  assignMessageContainerToMedia,
} from '../updaters/upload-updaters.js';

export const sendTextMessageRequestInputValidator: TInterface<SendTextMessageRequest> =
  tShape<SendTextMessageRequest>({
    threadID: tID,
    localID: t.maybe(t.String),
    text: t.String,
    sidebarCreation: t.maybe(t.Boolean),
  });

async function textMessageCreationResponder(
  viewer: Viewer,
  request: SendTextMessageRequest,
): Promise<SendMessageResponse> {
  const { threadID, localID, text: rawText, sidebarCreation } = request;
  const text = trimMessage(rawText);
  if (!text) {
    throw new ServerError('invalid_parameters');
  }

  const hasPermission = await checkThreadPermission(
    viewer,
    threadID,
    threadPermissions.VOICED,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  let messageData: TextMessageData = {
    type: messageTypes.TEXT,
    threadID,
    creatorID: viewer.id,
    time: Date.now(),
    text,
  };
  if (localID) {
    messageData = { ...messageData, localID };
  }
  if (sidebarCreation) {
    const numMessages = await fetchThreadMessagesCount(threadID);
    if (numMessages === 2) {
      // sidebarCreation is set below to prevent double notifs from a sidebar
      // creation. We expect precisely two messages to appear before a
      // sidebarCreation: a SIDEBAR_SOURCE and a CREATE_SIDEBAR. If two users
      // attempt to create a sidebar at the same time, then both clients will
      // attempt to set sidebarCreation here, but we only want to suppress
      // notifs for the client that won the race.
      messageData = { ...messageData, sidebarCreation };
    }
  }
  const rawMessageInfos = await createMessages(viewer, [messageData]);

  return { newMessageInfo: rawMessageInfos[0] };
}

export const fetchMessageInfosRequestInputValidator: TInterface<FetchMessageInfosRequest> =
  tShape<FetchMessageInfosRequest>({
    cursors: t.dict(tID, t.maybe(tID)),
    numberPerThread: t.maybe(t.Number),
  });

async function messageFetchResponder(
  viewer: Viewer,
  request: FetchMessageInfosRequest,
): Promise<FetchMessageInfosResponse> {
  const response = await fetchMessageInfos(
    viewer,
    { threadCursors: request.cursors },
    request.numberPerThread ? request.numberPerThread : defaultNumberPerThread,
  );
  return {
    ...response,
    userInfos: {},
  };
}

export const sendMultimediaMessageRequestInputValidator: TUnion<SendMultimediaMessageRequest> =
  t.union<SendMultimediaMessageRequest>([
    // This option is only used for messageTypes.IMAGES
    tShape({
      threadID: tID,
      localID: t.String,
      sidebarCreation: t.maybe(t.Boolean),
      mediaIDs: t.list(tID),
    }),
    tShape({
      threadID: tID,
      localID: t.String,
      sidebarCreation: t.maybe(t.Boolean),
      mediaMessageContents: t.list(tMediaMessageMedia),
    }),
  ]);
async function multimediaMessageCreationResponder(
  viewer: Viewer,
  request: SendMultimediaMessageRequest,
): Promise<SendMessageResponse> {
  if (
    (request.mediaIDs && request.mediaIDs.length === 0) ||
    (request.mediaMessageContents && request.mediaMessageContents.length === 0)
  ) {
    throw new ServerError('invalid_parameters');
  }

  const { threadID, localID, sidebarCreation } = request;
  const hasPermission = await checkThreadPermission(
    viewer,
    threadID,
    threadPermissions.VOICED,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const existingMessageInfoPromise = fetchMessageInfoForLocalID(
    viewer,
    localID,
  );
  const mediaPromise: Promise<$ReadOnlyArray<Media>> = request.mediaIDs
    ? fetchUnassignedImages(viewer, request.mediaIDs)
    : fetchUnassignedMediaFromMediaMessageContent(
        viewer,
        request.mediaMessageContents,
      );

  const [existingMessageInfo, media] = await Promise.all([
    existingMessageInfoPromise,
    mediaPromise,
  ]);

  if (media.length === 0 && !existingMessageInfo) {
    throw new ServerError('invalid_parameters');
  }

  // We use the MULTIMEDIA type for encrypted photos
  const containsEncryptedMedia = media.some(
    m => m.type === 'encrypted_photo' || m.type === 'encrypted_video',
  );
  const messageData = createMediaMessageData(
    {
      localID,
      threadID,
      creatorID: viewer.id,
      media,
      sidebarCreation,
    },
    { forceMultimediaMessageType: containsEncryptedMedia },
  );
  const [newMessageInfo] = await createMessages(viewer, [messageData]);
  const { id } = newMessageInfo;
  invariant(
    id !== null && id !== undefined,
    'serverID should be set in createMessages result',
  );

  if (request.mediaIDs) {
    await assignImages(viewer, request.mediaIDs, id, threadID);
  } else {
    await assignMessageContainerToMedia(
      viewer,
      request.mediaMessageContents,
      id,
      threadID,
    );
  }

  return { newMessageInfo };
}

export const sendReactionMessageRequestInputValidator: TInterface<SendReactionMessageRequest> =
  tShape<SendReactionMessageRequest>({
    threadID: tID,
    localID: t.maybe(t.String),
    targetMessageID: tID,
    reaction: tRegex(onlyOneEmojiRegex),
    action: t.enums.of(['add_reaction', 'remove_reaction']),
  });
async function reactionMessageCreationResponder(
  viewer: Viewer,
  request: SendReactionMessageRequest,
): Promise<SendMessageResponse> {
  const { threadID, localID, targetMessageID, reaction, action } = request;

  if (!targetMessageID || !reaction) {
    throw new ServerError('invalid_parameters');
  }

  const targetMessageInfo = await fetchMessageInfoByID(viewer, targetMessageID);

  if (!targetMessageInfo || !targetMessageInfo.id) {
    throw new ServerError('invalid_parameters');
  }

  const [serverThreadInfos, hasPermission, targetMessageUserInfos] =
    await Promise.all([
      fetchServerThreadInfos({ threadID }),
      checkThreadPermission(
        viewer,
        threadID,
        threadPermissions.REACT_TO_MESSAGE,
      ),
      fetchKnownUserInfos(viewer, [targetMessageInfo.creatorID]),
    ]);

  const targetMessageThreadInfo = serverThreadInfos.threadInfos[threadID];
  if (targetMessageThreadInfo.sourceMessageID === targetMessageID) {
    throw new ServerError('invalid_parameters');
  }

  const targetMessageCreator =
    targetMessageUserInfos[targetMessageInfo.creatorID];

  const targetMessageCreatorRelationship =
    targetMessageCreator?.relationshipStatus;

  const creatorRelationshipHasBlock =
    targetMessageCreatorRelationship &&
    relationshipBlockedInEitherDirection(targetMessageCreatorRelationship);

  if (!hasPermission || creatorRelationshipHasBlock) {
    throw new ServerError('invalid_parameters');
  }

  let messageData: ReactionMessageData = {
    type: messageTypes.REACTION,
    threadID,
    creatorID: viewer.id,
    time: Date.now(),
    targetMessageID,
    reaction,
    action,
  };
  if (localID) {
    messageData = { ...messageData, localID };
  }

  const rawMessageInfos = await createMessages(viewer, [messageData]);

  return { newMessageInfo: rawMessageInfos[0] };
}

export const editMessageRequestInputValidator: TInterface<SendEditMessageRequest> =
  tShape<SendEditMessageRequest>({
    targetMessageID: tID,
    text: t.String,
  });

async function editMessageCreationResponder(
  viewer: Viewer,
  request: SendEditMessageRequest,
): Promise<SendEditMessageResponse> {
  const { targetMessageID, text: rawText } = request;
  const text = trimMessage(rawText);
  if (!targetMessageID || !text) {
    throw new ServerError('invalid_parameters');
  }

  const targetMessageInfo = await fetchMessageInfoByID(viewer, targetMessageID);
  if (!targetMessageInfo || !targetMessageInfo.id) {
    throw new ServerError('invalid_parameters');
  }

  if (targetMessageInfo.type !== messageTypes.TEXT) {
    throw new ServerError('invalid_parameters');
  }

  const { threadID } = targetMessageInfo;

  const [serverThreadInfos, hasPermission, rawSidebarThreadInfos] =
    await Promise.all([
      fetchServerThreadInfos({ threadID }),
      checkThreadPermission(viewer, threadID, threadPermissions.EDIT_MESSAGE),
      fetchServerThreadInfos({
        parentThreadID: threadID,
        sourceMessageID: targetMessageID,
      }),
    ]);

  const targetMessageThreadInfo = serverThreadInfos.threadInfos[threadID];
  if (targetMessageThreadInfo.sourceMessageID === targetMessageID) {
    // When we try to edit a message from which a sidebar was created, the
    // client should send the ID of the message from the parent thread.
    // We're checking here if the ID from a sidebar was sent instead - this
    // is a mistake because editing it would result in a difference between
    // how the message is displayed in the parent thread and in the sidebar.
    throw new ServerError('invalid_parameters');
  }

  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  if (targetMessageInfo.creatorID !== viewer.id) {
    throw new ServerError('invalid_parameters');
  }

  const time = Date.now();
  const messagesData = [];
  let messageData: EditMessageData = {
    type: messageTypes.EDIT_MESSAGE,
    threadID,
    creatorID: viewer.id,
    time,
    targetMessageID,
    text,
  };
  messagesData.push(messageData);

  const sidebarThreadValues = values(rawSidebarThreadInfos.threadInfos);
  for (const sidebarThreadValue of sidebarThreadValues) {
    if (sidebarThreadValue && sidebarThreadValue.id) {
      messageData = {
        type: messageTypes.EDIT_MESSAGE,
        threadID: sidebarThreadValue.id,
        creatorID: viewer.id,
        time,
        targetMessageID,
        text: text,
      };
      messagesData.push(messageData);
    }
  }

  const newMessageInfos = await createMessages(viewer, messagesData);

  return { newMessageInfos };
}

export const fetchPinnedMessagesResponderInputValidator: TInterface<FetchPinnedMessagesRequest> =
  tShape<FetchPinnedMessagesRequest>({
    threadID: tID,
  });

async function fetchPinnedMessagesResponder(
  viewer: Viewer,
  request: FetchPinnedMessagesRequest,
): Promise<FetchPinnedMessagesResult> {
  return await fetchPinnedMessageInfos(viewer, request);
}

export const searchMessagesResponderInputValidator: TInterface<SearchMessagesKeyserverRequest> =
  tShape<SearchMessagesKeyserverRequest>({
    query: t.String,
    threadID: tID,
    cursor: t.maybe(tID),
  });

async function searchMessagesResponder(
  viewer: Viewer,
  request: SearchMessagesKeyserverRequest,
): Promise<SearchMessagesResponse> {
  return await searchMessagesInSingleChat(
    request.query,
    request.threadID,
    viewer,
    request.cursor,
  );
}

export const deleteMessageRequestValidator: TInterface<DeleteMessageRequest> =
  tShape<DeleteMessageRequest>({
    targetMessageID: tID,
  });

async function deleteMessageResponder(
  viewer: Viewer,
  request: DeleteMessageRequest,
): Promise<DeleteMessageResponse> {
  const { targetMessageID } = request;

  const targetMessageInfo = await fetchMessageInfoByID(viewer, targetMessageID);
  if (!targetMessageInfo || !targetMessageInfo.id) {
    throw new ServerError('invalid_parameters');
  }

  if (!isComposableMessageType(targetMessageInfo.type)) {
    throw new ServerError('invalid_parameters');
  }

  const { threadID } = targetMessageInfo;

  const permissionsToCheck =
    targetMessageInfo.creatorID === viewer.id
      ? [
          {
            check: 'permission',
            permission: threadPermissions.DELETE_ALL_MESSAGES,
          },
          {
            check: 'permission',
            permission: threadPermissions.DELETE_OWN_MESSAGES,
          },
        ]
      : [
          {
            check: 'permission',
            permission: threadPermissions.DELETE_ALL_MESSAGES,
          },
        ];

  const [serverThreadInfos, threadsWithPermissions, rawSidebarThreadInfos] =
    await Promise.all([
      fetchServerThreadInfos({ threadID }),
      checkThreadsOr(viewer, [threadID], permissionsToCheck),
      fetchServerThreadInfos({
        parentThreadID: threadID,
        sourceMessageID: targetMessageID,
      }),
    ]);

  const targetMessageThreadInfo = serverThreadInfos.threadInfos[threadID];
  if (targetMessageThreadInfo.sourceMessageID === targetMessageID) {
    // When we try to delete a message from which a sidebar was created, the
    // client should send the ID of the message from the parent thread.
    // We're checking here if the ID from a sidebar was sent instead - this
    // is a mistake because deleting it would result in a difference between
    // how the message is displayed in the parent thread and in the sidebar.
    throw new ServerError('invalid_parameters');
  }

  const hasPermission = threadsWithPermissions.has(threadID);
  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const time = Date.now();
  const messagesData: Array<DeleteMessageData> = [];
  messagesData.push({
    type: messageTypes.DELETE_MESSAGE,
    threadID,
    creatorID: viewer.id,
    time,
    targetMessageID,
  });

  const sidebarThreadValues = values(rawSidebarThreadInfos.threadInfos);
  for (const sidebarThreadValue of sidebarThreadValues) {
    if (sidebarThreadValue && sidebarThreadValue.id) {
      messagesData.push({
        type: messageTypes.DELETE_MESSAGE,
        threadID: sidebarThreadValue.id,
        creatorID: viewer.id,
        time,
        targetMessageID,
      });
    }
  }

  const newMessageInfos = await createMessages(viewer, messagesData);

  return { newMessageInfos };
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
  editMessageCreationResponder,
  fetchPinnedMessagesResponder,
  searchMessagesResponder,
  deleteMessageResponder,
};
