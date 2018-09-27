// @flow

import type { Viewer } from '../session/viewer';
import {
  messageTypes,
  type MessageData,
  type SendTextMessageRequest,
  type FetchMessageInfosResult,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendTextMessageResponse,
} from 'lib/types/message-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/errors';
import { threadPermissions } from 'lib/types/thread-types';

import createMessages from '../creators/message-creator';
import { validateInput, tShape } from '../utils/validation-utils';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import { fetchMessageInfos } from '../fetchers/message-fetchers';

const sendTextMessageRequestInputValidator = tShape({
  threadID: t.String,
  text: t.String,
});

async function textMessageCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<SendTextMessageResponse> {
  const request: SendTextMessageRequest = input;
  validateInput(sendTextMessageRequestInputValidator, request);

  const { threadID, text: rawText } = request;
  const text = rawText.trim();
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

  const messageData = {
    type: messageTypes.TEXT,
    threadID,
    creatorID: viewer.id,
    time: Date.now(),
    text,
  };
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
): Promise<FetchMessageInfosResult> {
  const request: FetchMessageInfosRequest = input;
  validateInput(fetchMessageInfosRequestInputValidator, request);
  return await fetchMessageInfos(
    viewer,
    { threadCursors: request.cursors },
    request.numberPerThread ? request.numberPerThread : defaultNumberPerThread,
  );
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
};
