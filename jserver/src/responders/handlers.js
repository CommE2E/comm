// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/fetch-utils';

import {
  fetchViewerForJSONRequest,
  addCookieToJSONResponse,
} from '../session/cookies';

export type JSONResponder = (viewer: Viewer, input: any) => Promise<*>;

function jsonHandler(responder: JSONResponder) {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForJSONRequest(req);
      if (!req.body || typeof req.body !== "object") {
        throw new ServerError('invalid_parameters');
      }
      const responderResult = await responder(viewer, req.body.input);
      if (res.headersSent) {
        return;
      }
      const result = { ...responderResult };
      await addCookieToJSONResponse(viewer, res, result);
      res.json({ success: true, ...result });
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
