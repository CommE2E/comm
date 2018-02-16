// @flow

import type { $Response, $Request } from 'express';
import type {
  MessageData,
  TextMessageCreationInfo,
} from 'lib/types/message-types';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';
import { threadPermissions } from 'lib/types/thread-types';
import { messageType } from 'lib/types/message-types';

import createMessages from '../creators/message-creator';
import { tShape } from '../utils/tcomb-utils';
import { checkThreadPermission } from '../fetchers/thread-fetchers';
import { currentViewer } from '../session/viewer';

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

export {
  messageCreationResponder,
  textMessageCreationResponder,
};
