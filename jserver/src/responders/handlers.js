// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/fetch-utils';

import { getViewerFromCookie } from '../session/cookies';

type Responder = (viewer: Viewer, req: $Request, res: $Response) => Promise<*>;

function jsonHandler(responder: Responder) {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await getViewerFromCookie(req.cookies);
      const result = await responder(viewer, req, res);
      if (!res.headersSent) {
        res.json({ success: true, ...result });
      }
    } catch (e) {
      console.warn(e);
      if (res.headersSent) {
        return;
      }
      if (e instanceof ServerError) {
        res.json({ error: e.message, ...e.result });
      } else {
        res.status(500).send(e.message);
      }
    }
  };
}

export {
  jsonHandler,
};
