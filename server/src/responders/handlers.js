// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/fetch-utils';

import {
  fetchViewerForJSONRequest,
  addCookieToJSONResponse,
  fetchViewerForHomeRequest,
  addCookieToHomeResponse,
} from '../session/cookies';

export type JSONResponder = (viewer: Viewer, input: any) => Promise<*>;
export type DownloadResponder
  = (viewer: Viewer, req: $Request, res: $Response) => Promise<void>;
export type HTMLResponder = (viewer: Viewer, url: string) => Promise<string>;

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
      handleException(e, res);
    }
  };
}

function downloadHandler(responder: DownloadResponder) {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForJSONRequest(req);
      await responder(viewer, req, res);
    } catch (e) {
      handleException(e, res);
    }
  };
}

function getMessageForException(error: Error) {
  return error.sqlMessage ? "database error" : error.message;
}

function handleException(error: Error, res: $Response) {
  console.warn(error);
  if (res.headersSent) {
    return;
  }
  if (error instanceof ServerError && error.payload) {
    res.json({ error: error.message, payload: error.payload });
  } else if (error instanceof ServerError) {
    res.json({ error: error.message });
  } else {
    res.status(500).send(getMessageForException(error));
  }
}

function htmlHandler(responder: HTMLResponder) {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForHomeRequest(req);
      const rendered = await responder(viewer, req.url);
      addCookieToHomeResponse(viewer, res);
      res.send(rendered);
    } catch (e) {
      console.warn(e);
      if (!res.headersSent) {
        res.status(500).send(getMessageForException(e));
      }
    }
  };
}

export {
  jsonHandler,
  downloadHandler,
  htmlHandler,
};
