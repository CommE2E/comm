// @flow

import type { $Response, $Request } from 'express';
import type { Viewer } from '../session/viewer';

import { ServerError } from 'lib/utils/errors';

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
    let viewer;
    try {
      if (!req.body || typeof req.body !== "object") {
        throw new ServerError('invalid_parameters');
      }
      const { input } = req.body;
      viewer = await fetchViewerForJSONRequest(req);
      const responderResult = await responder(viewer, input);
      if (res.headersSent) {
        return;
      }
      const result = { ...responderResult };
      await addCookieToJSONResponse(viewer, res, result);
      res.json({ success: true, ...result });
    } catch (e) {
      await handleException(e, res, viewer);
    }
  };
}

function downloadHandler(responder: DownloadResponder) {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForJSONRequest(req);
      await responder(viewer, req, res);
    } catch (e) {
      // Passing viewer in only makes sense if we want to handle failures as
      // JSON. We don't, and presume all download handlers avoid ServerError.
      await handleException(e, res);
    }
  };
}

function getMessageForException(error: Error & { sqlMessage?: string }) {
  return error.sqlMessage !== null ? "database error" : error.message;
}

async function handleException(
  error: Error,
  res: $Response,
  viewer: ?Viewer,
) {
  console.warn(error);
  if (res.headersSent) {
    return;
  }
  if (!(error instanceof ServerError)) {
    res.status(500).send(getMessageForException(error));
    return;
  }
  const result: Object = error.payload
    ? { error: error.message, payload: error.payload }
    : { error: error.message };
  if (viewer) {
    // This can mutate the result object
    await addCookieToJSONResponse(viewer, res, result);
  }
  res.json(result);
}

async function handleAsyncPromise(promise: Promise<any>) {
  try {
    await promise;
  } catch (error) {
    console.warn(error);
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
  handleAsyncPromise,
};
