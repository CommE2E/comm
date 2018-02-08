// @flow

import type { $Response, $Request } from 'express';
import type { MessageData } from 'lib/types/message-types';

import createMessages from '../creators/message-creator';
import { setCurrentViewerFromCookie } from '../session/cookies';

async function messageCreationResponder(req: $Request, res: $Response) {
  const messageDatas: MessageData[] = (req.body: any);
  // We don't currently do any input validation since we have only internal
  // callers as of now
  await setCurrentViewerFromCookie(req.cookies);
  const rawMessageInfos = await createMessages(messageDatas);
  return { success: true, rawMessageInfos };
}

export {
  messageCreationResponder,
};
