// @flow

import type { $Response, $Request } from 'express';
import type {
  MessageData,
  TextMessageCreationInfo,
} from 'lib/types/message-types';

import t from 'tcomb';

import { threadPermissions } from 'lib/types/thread-types';
import { messageType } from 'lib/types/message-types';

import createMessages from '../creators/message-creator';
import { setCurrentViewerFromCookie } from '../session/cookies';
import { tShape } from '../utils/tcomb-utils';
import { checkThreadPermission } from '../fetchers/thread-fetcher';
import { currentViewer } from '../session/viewer';

async function messageCreationResponder(req: $Request, res: $Response) {
  const messageDatas: MessageData[] = (req.body: any);
  // We don't currently do any input validation since we have only internal
  // callers as of now
  await setCurrentViewerFromCookie(req.cookies);
  const rawMessageInfos = await createMessages(messageDatas);
  return { success: true, rawMessageInfos };
}

const textMessageCreationInfoInputValidator = tShape({
  threadID: t.String,
  text: t.String,
});

async function textMessageCreationResponder(req: $Request, res: $Response) {
  const textMessageCreationInfo: TextMessageCreationInfo = (req.body: any);
  if (!textMessageCreationInfoInputValidator.is(textMessageCreationInfo)) {
    return { error: 'invalid_parameters' };
  }

  await setCurrentViewerFromCookie(req.cookies);
  const hasPermission = await checkThreadPermission(
    textMessageCreationInfo.threadID,
    threadPermissions.VOICED,
  );
  if (!hasPermission) {
    return { error: 'invalid_parameters' };
  }

  const messageData = {
    type: messageType.TEXT,
    threadID: textMessageCreationInfo.threadID,
    creatorID: currentViewer().id,
    time: Date.now(),
    text: textMessageCreationInfo.text,
  };
  const rawMessageInfos = await createMessages([messageData]);

  return { success: true, newMessageInfo: rawMessageInfos[0] };
}

export {
  messageCreationResponder,
  textMessageCreationResponder,
};
