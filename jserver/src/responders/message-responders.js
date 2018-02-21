// @flow

import type { $Response, $Request } from 'express';
import {
  messageType,
  type MessageData,
  type TextMessageCreationInfo,
  type FetchMessageInfosResult,
  type FetchMessageInfosRequest,
  defaultNumberPerThread,
} from 'lib/types/message-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';

import createMessages from '../creators/message-creator';
import { tShape } from '../utils/tcomb-utils';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import { currentViewer } from '../session/viewer';
import { fetchMessageInfos } from '../fetchers/message-fetchers';

async function messageCreationResponder(req: $Request, res: $Response) {
  const messageDatas: MessageData[] = (req.body: any);
  // We don't currently do any input validation since we have only internal
  // callers as of now
  const rawMessageInfos = await createMessages(messageDatas);
  return { rawMessageInfos };
}

const textMessageCreationInfoInputValidator = tShape({
  threadID: t.String,
  text: t.String,
});

async function textMessageCreationResponder(req: $Request, res: $Response) {
  const textMessageCreationInfo: TextMessageCreationInfo = (req.body: any);
  if (!textMessageCreationInfoInputValidator.is(textMessageCreationInfo)) {
    throw new ServerError('invalid_parameters');
  }

  const hasPermission = await checkThreadPermission(
    textMessageCreationInfo.threadID,
    threadPermissions.VOICED,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_parameters');
  }

  const messageData = {
    type: messageType.TEXT,
    threadID: textMessageCreationInfo.threadID,
    creatorID: currentViewer().id,
    time: Date.now(),
    text: textMessageCreationInfo.text,
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

  const numberPerThread = fetchMessageInfosRequest.numberPerThread
    ? fetchMessageInfosRequest.numberPerThread
    : defaultNumberPerThread;
  const threadSelectionCriteria = {
    threadCursors: fetchMessageInfosRequest.cursors,
  };
  const result = await fetchMessageInfos(
    threadSelectionCriteria,
    numberPerThread,
  );
  const { rawMessageInfos, truncationStatuses, userInfos } = result;
  return { rawMessageInfos, truncationStatuses, userInfos };
}

export {
  messageCreationResponder,
  textMessageCreationResponder,
  messageFetchResponder,
};
