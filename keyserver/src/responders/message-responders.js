// @flow

import invariant from 'invariant';
import t from 'tcomb';

import { createMediaMessageData, trimMessage } from 'lib/shared/message-utils';
import type { Media } from 'lib/types/media-types.js';
import {
  messageTypes,
  type SendTextMessageRequest,
  type SendMultimediaMessageRequest,
  type SendReactionMessageRequest,
  type FetchMessageInfosResponse,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendMessageResponse,
  type ReactionMessageData,
} from 'lib/types/message-types';
import type { TextMessageData } from 'lib/types/messages/text';
import { threadPermissions } from 'lib/types/thread-types';
import { ServerError } from 'lib/utils/errors';
import { tShape, tMediaMessageMedia } from 'lib/utils/validation-utils';

import createMessages from '../creators/message-creator';
import {
  fetchMessageInfos,
  fetchMessageInfoForLocalID,
} from '../fetchers/message-fetchers';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers';
import {
  fetchMedia,
  fetchMediaFromMediaMessageContent,
} from '../fetchers/upload-fetchers';
import type { Viewer } from '../session/viewer';
import {
  assignMedia,
  assignMessageContainerToMedia,
} from '../updaters/upload-updaters';
import { validateInput } from '../utils/validation-utils';

const sendTextMessageRequestInputValidator = tShape({
  threadID: t.String,
  localID: t.maybe(t.String),
  text: t.String,
});
async function textMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendMessageResponse> {
  const request: SendTextMessageRequest = input;
  await validateInput(viewer, sendTextMessageRequestInputValidator, request);

  const { threadID, localID, text: rawText } = request;
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

  const messageData: TextMessageData = {
    type: messageTypes.TEXT,
    threadID,
    creatorID: viewer.id,
    time: Date.now(),
    text,
  };
  if (localID) {
    messageData.localID = localID;
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
  tShape({
    threadID: t.String,
    localID: t.String,
    mediaIDs: t.list(t.String),
  }),
  tShape({
    threadID: t.String,
    localID: t.String,
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

  const { threadID, localID } = request;
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
    ? fetchMedia(viewer, request.mediaIDs)
    : fetchMediaFromMediaMessageContent(viewer, request.mediaMessageContents);

  const [existingMessageInfo, media] = await Promise.all([
    existingMessageInfoPromise,
    mediaPromise,
  ]);

  if (media.length === 0 && !existingMessageInfo) {
    throw new ServerError('invalid_parameters');
  }

  const messageData = createMediaMessageData({
    localID,
    threadID,
    creatorID: viewer.id,
    media,
  });
  const [newMessageInfo] = await createMessages(viewer, [messageData]);
  const { id } = newMessageInfo;
  invariant(
    id !== null && id !== undefined,
    'serverID should be set in createMessages result',
  );

  if (request.mediaIDs) {
    await assignMedia(viewer, request.mediaIDs, id);
  } else {
    await assignMessageContainerToMedia(
      viewer,
      request.mediaMessageContents,
      id,
    );
  }

  return { newMessageInfo };
}

const sendReactionMessageRequestInputValidator = tShape({
  threadID: t.String,
  targetMessageID: t.String,
  reaction: t.String,
  action: t.enums.of(['add_reaction', 'remove_reaction']),
});
async function reactionMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendMessageResponse> {
  const request: SendReactionMessageRequest = input;
  await validateInput(viewer, sendReactionMessageRequestInputValidator, input);

  const { threadID, targetMessageID, reaction, action } = request;

  if (!targetMessageID || !reaction || !action) {
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

  const messageData: ReactionMessageData = {
    type: messageTypes.REACTION,
    threadID,
    creatorID: viewer.id,
    time: Date.now(),
    targetMessageID,
    reaction,
    action,
  };

  const rawMessageInfos = await createMessages(viewer, [messageData]);

  return { newMessageInfo: rawMessageInfos[0] };
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
  reactionMessageCreationResponder,
};
