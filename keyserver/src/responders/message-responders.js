// @flow

import invariant from 'invariant';
import t from 'tcomb';

import { createMediaMessageData, trimMessage } from 'lib/shared/message-utils';
import {
  messageTypes,
  type SendTextMessageRequest,
  type SendMultimediaMessageRequest,
  type FetchMessageInfosResponse,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendMessageResponse,
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
import { fetchMedia } from '../fetchers/upload-fetchers';
import type { Viewer } from '../session/viewer';
import { assignMedia } from '../updaters/upload-updaters';
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
  return legacyMultimediaMessageCreationResponder(viewer, request);
}

async function legacyMultimediaMessageCreationResponder(
  viewer: Viewer,
  request: SendMultimediaMessageRequest,
): Promise<SendMessageResponse> {
  invariant(request.mediaIDs);
  const { threadID, localID, mediaIDs } = request;
  if (mediaIDs.length === 0) {
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

  const [media, existingMessageInfo] = await Promise.all([
    fetchMedia(viewer, mediaIDs),
    fetchMessageInfoForLocalID(viewer, localID),
  ]);
  if (media.length !== mediaIDs.length && !existingMessageInfo) {
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
  await assignMedia(viewer, mediaIDs, id);

  return { newMessageInfo };
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
  multimediaMessageCreationResponder,
};
