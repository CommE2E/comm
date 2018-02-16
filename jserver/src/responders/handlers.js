// @flow

import type { $Response, $Request } from 'express';

import { ServerError } from 'lib/utils/fetch-utils';

import { setCurrentViewerFromCookie } from '../session/cookies';

type Responder = (req: $Request, res: $Response) => Promise<*>;

function jsonHandler(responder: Responder) {
  return async (req: $Request, res: $Response) => {
    try {
      await setCurrentViewerFromCookie(req.cookies);
      const result = await responder(req, res);
      if (!res.headersSent) {
        res.json({ success: true, ...result });
      }
    } catch (e) {
      console.warn(e);
      if (res.headersSent) {
        return;
      }
      if (e instanceof ServerError) {
        res.json({ error: e.message });
      } else {
        res.status(500).send(e.message);
      }
    }
  };
}

export {
  jsonHandler,
};
