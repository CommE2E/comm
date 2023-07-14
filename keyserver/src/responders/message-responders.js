// @flow

import invariant from 'invariant';
import t, { type TInterface } from 'tcomb';

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
  messageTruncationStatusesValidator,
  rawMessageInfoValidator,
  type SearchMessagesResponse,
  type SearchMessagesRequest,
} from 'lib/types/message-types.js';
import type { EditMessageData } from 'lib/types/messages/edit.js';
import type { ReactionMessageData } from 'lib/types/messages/reaction.js';
import type { TextMessageData } from 'lib/types/messages/text.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { userInfosValidator } from 'lib/types/user-types.js';
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
import { validateInput, validateOutput } from '../utils/validation-utils.js';

const sendTextMessageRequestInputValidator = tShape<SendTextMessageRequest>({
  threadID: tID,
  localID: t.maybe(t.String),
  text: t.String,
  sidebarCreation: t.maybe(t.Boolean),
});

export const sendMessageResponseValidator: TInterface<SendMessageResponse> =
  tShape<SendMessageResponse>({ newMessageInfo: rawMessageInfoValidator });

async function textMessageCreationResponder(
  viewer: Viewer,
  input: mixed,
): Promise<SendMessageResponse> {
  const request = await validateInput(
    viewer,
    sendTextMessageRequestInputValidator,
    input,
  );

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

  const response = { newMessageInfo: rawMessageInfos[0] };
  return validateOutput(
    viewer.platformDetails,
    sendMessageResponseValidator,
    response,
  );
}

const fetchMessageInfosRequestInputValidator = tShape<FetchMessageInfosRequest>(
  {
    cursors: t.dict(tID, t.maybe(tID)),
    numberPerThread: t.maybe(t.Number),
  },
);

export const fetchMessageInfosResponseValidator: TInterface<FetchMessageInfosResponse> =
  tShape<FetchMessageInfosResponse>({
    rawMessageInfos: t.list(rawMessageInfoValidator),
    truncationStatuses: messageTruncationStatusesValidator,
    userInfos: userInfosValidator,
  });

async function messageFetchResponder(
  viewer: Viewer,
  input: mixed,
): Promise<FetchMessageInfosResponse> {
  const request = await validateInput(
    viewer,
    fetchMessageInfosRequestInputValidator,
    input,
  );
  const response = await fetchMessageInfos(
    viewer,
    { threadCursors: request.cursors },
    request.numberPerThread ? request.numberPerThread : defaultNumberPerThread,
  );
  return validateOutput(
    viewer.platformDetails,
    fetchMessageInfosResponseValidator,
    {
      ...response,
      userInfos: {},
    },
  );
}

const sendMultimediaMessageRequestInputValidator =
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
  input: mixed,
): Promise<SendMessageResponse> {
  const request = await validateInput(
    viewer,
    sendMultimediaMessageRequestInputValidator,
    input,
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

  const response = { newMessageInfo };
  return validateOutput(
    viewer.platformDetails,
    sendMessageResponseValidator,
    response,
  );
}

const sendReactionMessageRequestInputValidator =
  tShape<SendReactionMessageRequest>({
    threadID: tID,
    localID: t.maybe(t.String),
    targetMessageID: tID,
    reaction: tRegex(onlyOneEmojiRegex),
    action: t.enums.of(['add_reaction', 'remove_reaction']),
  });
async function reactionMessageCreationResponder(
  viewer: Viewer,
  input: mixed,
): Promise<SendMessageResponse> {
  const request = await validateInput(
    viewer,
    sendReactionMessageRequestInputValidator,
    input,
  );

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

  const response = { newMessageInfo: rawMessageInfos[0] };
  return validateOutput(
    viewer.platformDetails,
    sendMessageResponseValidator,
    response,
  );
}

const editMessageRequestInputValidator = tShape<SendEditMessageRequest>({
  targetMessageID: tID,
  text: t.String,
});

export const sendEditMessageResponseValidator: TInterface<SendEditMessageResponse> =
  tShape<SendEditMessageResponse>({
    newMessageInfos: t.list(rawMessageInfoValidator),
  });

async function editMessageCreationResponder(
  viewer: Viewer,
  input: mixed,
): Promise<SendEditMessageResponse> {
  const request = await validateInput(
    viewer,
    editMessageRequestInputValidator,
    input,
  );

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

  const response = { newMessageInfos };
  return validateOutput(
    viewer.platformDetails,
    sendEditMessageResponseValidator,
    response,
  );
}

const fetchPinnedMessagesResponderInputValidator =
  tShape<FetchPinnedMessagesRequest>({
    threadID: tID,
  });

export const fetchPinnedMessagesResultValidator: TInterface<FetchPinnedMessagesResult> =
  tShape<FetchPinnedMessagesResult>({
    pinnedMessages: t.list(rawMessageInfoValidator),
  });

async function fetchPinnedMessagesResponder(
  viewer: Viewer,
  input: mixed,
): Promise<FetchPinnedMessagesResult> {
  const request = await validateInput(
    viewer,
    fetchPinnedMessagesResponderInputValidator,
    input,
  );
  const response = await fetchPinnedMessageInfos(viewer, request);
  return validateOutput(
    viewer.platformDetails,
    fetchPinnedMessagesResultValidator,
    response,
  );
}

const searchMessagesResponderInputValidator = tShape({
  query: t.String,
  threadID: tID,
  cursor: t.maybe(tID),
});

const searchMessagesResponseValidator: TInterface<SearchMessagesResponse> =
  tShape<SearchMessagesResponse>({
    messages: t.list(rawMessageInfoValidator),
    endReached: t.Boolean,
  });

async function searchMessagesResponder(
  viewer: Viewer,
  input: mixed,
): Promise<SearchMessagesResponse> {
  const request: SearchMessagesRequest = await validateInput(
    viewer,
    searchMessagesResponderInputValidator,
    input,
  );

  const response = await searchMessagesInSingleChat(
    request.query,
    request.threadID,
    viewer,
    request.cursor,
  );
  return validateOutput(
    viewer.platformDetails,
    searchMessagesResponseValidator,
    response,
  );
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
  editMessageCreationResponder,
  fetchPinnedMessagesResponder,
  searchMessagesResponder,
};
