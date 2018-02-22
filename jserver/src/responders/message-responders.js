// @flow

import type { $Response, $Request } from 'express';
import {
  messageType,
  type MessageData,
  type SendTextMessageRequest,
  type FetchMessageInfosResult,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
  type SendTextMessageResponse,
} from 'lib/types/message-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import createMessages from '../creators/message-creator';
import { tShape } from '../utils/tcomb-utils';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import { currentViewer } from '../session/viewer';
import { fetchMessageInfos } from '../fetchers/message-fetchers';

const sendTextMessageRequestInputValidator = tShape({
  threadID: t.String,
  text: t.String,
});

async function textMessageCreationResponder(
  req: $Request,
  res: $Response,
): Promise<SendTextMessageResponse> {
  const sendTextMessageRequest: SendTextMessageRequest = (req.body: any);
  if (!sendTextMessageRequestInputValidator.is(sendTextMessageRequest)) {
    throw new ServerError('invalid_parameters');
  }

  const hasPermission = await checkThreadPermission(
    sendTextMessageRequest.threadID,
    threadPermissions.VOICED,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const messageData = {
    type: messageType.TEXT,
    threadID: sendTextMessageRequest.threadID,
    creatorID: currentViewer().id,
    time: Date.now(),
    text: sendTextMessageRequest.text,
  };
  const rawMessageInfos = await createMessages([messageData]);

  return { newMessageInfo: rawMessageInfos[0] };
}

const fetchMessageInfosRequestInputValidator = tShape({
  cursors: t.dict(t.String, t.maybe(t.String)),
  numberPerThread: t.maybe(t.Number),
});

async function messageFetchResponder(
  req: $Request,
  res: $Response,
): Promise<FetchMessageInfosResult> {
  const fetchMessageInfosRequest: FetchMessageInfosRequest = (req.body: any);
  if (!fetchMessageInfosRequestInputValidator.is(fetchMessageInfosRequest)) {
    throw new ServerError('invalid_parameters');
  }

  return await fetchMessageInfos(
    { threadCursors: fetchMessageInfosRequest.cursors },
    fetchMessageInfosRequest.numberPerThread
      ? fetchMessageInfosRequest.numberPerThread
      : defaultNumberPerThread,
  );
}

export {
  textMessageCreationResponder,
  messageFetchResponder,
};
