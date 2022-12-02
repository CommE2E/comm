// @flow

import type { $Response, $Request } from 'express';

import { ServerError } from 'lib/utils/errors';

import { deleteCookie } from '../deleters/cookie-deleters';
import type { PolicyType } from '../lib/facts/policies.js';
import {
  fetchViewerForJSONRequest,
  addCookieToJSONResponse,
  fetchViewerForHomeRequest,
  addCookieToHomeResponse,
  createNewAnonymousCookie,
} from '../session/cookies';
import type { Viewer } from '../session/viewer';
import { type AppURLFacts, getAppURLFactsFromRequestURL } from '../utils/urls';
import { policiesValidator } from '../utils/validation-utils.js';
import { getMessageForException } from './utils';

export type JSONResponder = {
  responder: (viewer: Viewer, input: any) => Promise<*>,
  requiredPolicies: $ReadOnlyArray<PolicyType>,
};

export type DownloadResponder = (
  viewer: Viewer,
  req: $Request,
  res: $Response,
) => Promise<void>;
export type HTMLResponder = DownloadResponder;
export type HTTPGetResponder = DownloadResponder;

function jsonHandler(
  responder: JSONResponder,
  expectCookieInvalidation: boolean,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    let viewer;
    try {
      if (!req.body || typeof req.body !== 'object') {
        throw new ServerError('invalid_parameters');
      }
      const { input } = req.body;
      viewer = await fetchViewerForJSONRequest(req);
      await policiesValidator(viewer, responder.requiredPolicies);
      const responderResult = await responder.responder(viewer, input);
      if (res.headersSent) {
        return;
      }
      const result = { ...responderResult };
      addCookieToJSONResponse(
        viewer,
        res,
        result,
        expectCookieInvalidation,
        getAppURLFactsFromRequestURL(req.originalUrl),
      );
      res.json({ success: true, ...result });
    } catch (e) {
      await handleException(
        e,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
        viewer,
        expectCookieInvalidation,
      );
    }
  };
}

function httpGetHandler(
  responder: HTTPGetResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    let viewer;
    try {
      viewer = await fetchViewerForJSONRequest(req);
      await responder(viewer, req, res);
    } catch (e) {
      await handleException(
        e,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
        viewer,
      );
    }
  };
}

function downloadHandler(
  responder: DownloadResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForJSONRequest(req);
      await responder(viewer, req, res);
    } catch (e) {
      // Passing viewer in only makes sense if we want to handle failures as
      // JSON. We don't, and presume all download handlers avoid ServerError.
      await handleException(
        e,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
      );
    }
  };
}

async function handleException(
  error: Error,
  res: $Response,
  appURLFacts: AppURLFacts,
  viewer?: ?Viewer,
  expectCookieInvalidation?: boolean,
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
    if (error.message === 'client_version_unsupported' && viewer.loggedIn) {
      // If the client version is unsupported, log the user out
      const { platformDetails } = error;
      const [data] = await Promise.all([
        createNewAnonymousCookie({
          platformDetails,
          deviceToken: viewer.deviceToken,
        }),
        deleteCookie(viewer.cookieID),
      ]);
      viewer.setNewCookie(data);
      viewer.cookieInvalidated = true;
    }
    // This can mutate the result object
    addCookieToJSONResponse(
      viewer,
      res,
      result,
      !!expectCookieInvalidation,
      appURLFacts,
    );
  }
  res.json(result);
}

function htmlHandler(
  responder: HTMLResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    try {
      const viewer = await fetchViewerForHomeRequest(req);
      addCookieToHomeResponse(
        viewer,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
      );
      res.type('html');
      await responder(viewer, req, res);
    } catch (e) {
      console.warn(e);
      if (!res.headersSent) {
        res.status(500).send(getMessageForException(e));
      }
    }
  };
}

type MulterFile = {
  fieldname: string,
  originalname: string,
  encoding: string,
  mimetype: string,
  buffer: Buffer,
  size: number,
};
export type MulterRequest = $Request & {
  files?: $ReadOnlyArray<MulterFile>,
  ...
};
type UploadResponder = (viewer: Viewer, req: MulterRequest) => Promise<Object>;

function uploadHandler(
  responder: UploadResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    let viewer;
    try {
      if (!req.body || typeof req.body !== 'object') {
        throw new ServerError('invalid_parameters');
      }
      viewer = await fetchViewerForJSONRequest(req);
      const responderResult = await responder(
        viewer,
        ((req: any): MulterRequest),
      );
      if (res.headersSent) {
        return;
      }
      const result = { ...responderResult };
      addCookieToJSONResponse(
        viewer,
        res,
        result,
        false,
        getAppURLFactsFromRequestURL(req.originalUrl),
      );
      res.json({ success: true, ...result });
    } catch (e) {
      await handleException(
        e,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
        viewer,
      );
    }
  };
}

async function handleAsyncPromise(promise: Promise<any>) {
  try {
    await promise;
  } catch (error) {
    console.warn(error);
  }
}

export {
  jsonHandler,
  httpGetHandler,
  downloadHandler,
  htmlHandler,
  uploadHandler,
  handleAsyncPromise,
};
