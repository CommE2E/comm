// @flow

import invariant from 'invariant';
import t from 'tcomb';

import { onlyOneEmojiRegex } from 'lib/shared/emojis.js';
import {
  createMediaMessageData,
  trimMessage,
} from 'lib/shared/message-utils.js';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils.js';
import type { Media } from 'lib/types/media-types.js';
import {
  messageTypes,
  type SendTextMessageRequest,
  type SendMultimediaMessageRequest,
  type SendReactionMessageRequest,
  type SendEditMessageRequest,
  type FetchMessageInfosResponse,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendMessageResponse,
  type SendEditMessageResponse,
} from 'lib/types/message-types.js';
import type { EditMessageData } from 'lib/types/messages/edit.js';
import type { ReactionMessageData } from 'lib/types/messages/reaction.js';
import type { TextMessageData } from 'lib/types/messages/text.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { values } from 'lib/utils/objects.js';
import {
  tRegex,
  tShape,
  tMediaMessageMedia,
} from 'lib/utils/validation-utils.js';

import createMessages from '../creators/message-creator.js';
import { SQL } from '../database/database.js';
import {
  fetchMessageInfos,
  fetchMessageInfoForLocalID,
  fetchMessageInfoByID,
  fetchThreadMessagesCount,
} from '../fetchers/message-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import {
  fetchImages,
  fetchMediaFromMediaMessageContent,
} from '../fetchers/upload-fetchers.js';
import { fetchKnownUserInfos } from '../fetchers/user-fetchers.js';
import type { Viewer } from '../session/viewer.js';
import {
  assignImages,
  assignMessageContainerToMedia,
} from '../updaters/upload-updaters.js';
import { validateInput } from '../utils/validation-utils.js';

const sendTextMessageRequestInputValidator = tShape({
  threadID: t.String,
  localID: t.maybe(t.String),
  text: t.String,
  sidebarCreation: t.maybe(t.Boolean),
});
async function textMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendMessageResponse> {
  const request: SendTextMessageRequest = input;
  await validateInput(viewer, sendTextMessageRequestInputValidator, request);

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

const fetchMessageInfosRequestInputValidator = tShape({
  cursors: t.dict(t.String, t.maybe(t.String)),
  numberPerThread: t.maybe(t.Number),
});
async function messageFetchResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchMessageInfosResponse> {
  const request: FetchMessageInfosRequest = input;
  await validateInput(viewer, fetchMessageInfosRequestInputValidator, request);
  const response = await fetchMessageInfos(
    viewer,
    { threadCursors: request.cursors },
    request.numberPerThread ? request.numberPerThread : defaultNumberPerThread,
  );
  return { ...response, userInfos: {} };
}

const sendMultimediaMessageRequestInputValidator = t.union([
  // This option is only used for messageTypes.IMAGES
  tShape({
    threadID: t.String,
    localID: t.String,
    sidebarCreation: t.maybe(t.Boolean),
    mediaIDs: t.list(t.String),
  }),
  tShape({
    threadID: t.String,
    localID: t.String,
    sidebarCreation: t.maybe(t.Boolean),
    mediaMessageContents: t.list(tMediaMessageMedia),
  }),
]);
async function multimediaMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendMessageResponse> {
  const request: SendMultimediaMessageRequest = input;
  await validateInput(
    viewer,
    sendMultimediaMessageRequestInputValidator,
    request,
  );

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
    ? fetchImages(viewer, request.mediaIDs)
    : fetchMediaFromMediaMessageContent(viewer, request.mediaMessageContents);

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

const sendReactionMessageRequestInputValidator = tShape({
  threadID: t.String,
  localID: t.maybe(t.String),
  targetMessageID: t.String,
  reaction: tRegex(onlyOneEmojiRegex),
  action: t.enums.of(['add_reaction', 'remove_reaction']),
});
async function reactionMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendMessageResponse> {
  const request: SendReactionMessageRequest = input;
  await validateInput(viewer, sendReactionMessageRequestInputValidator, input);

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
      fetchServerThreadInfos(SQL`t.id = ${threadID}`),
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

const editMessageRequestInputValidator = tShape({
  targetMessageID: t.String,
  text: t.String,
});
async function editMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendEditMessageResponse> {
  const request: SendEditMessageRequest = input;
  await validateInput(viewer, editMessageRequestInputValidator, input);

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
      fetchServerThreadInfos(SQL`t.id = ${threadID}`),
      checkThreadPermission(viewer, threadID, threadPermissions.EDIT_MESSAGE),
      fetchServerThreadInfos(
        SQL`t.parent_thread_id = ${threadID} AND t.source_message = ${targetMessageID}`,
      ),
    ]);

  const targetMessageThreadInfo = serverThreadInfos.threadInfos[threadID];
  if (targetMessageThreadInfo.sourceMessageID === targetMessageID) {
    // We are editing first message of the sidebar
    // If client wants to do that it sends id of the sourceMessage instead
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

export {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
  editMessageCreationResponder,
};
