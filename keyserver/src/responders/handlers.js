// @flow

import type { $Response, $Request } from 'express';
import type { TType } from 'tcomb';

import type { Endpoint } from 'lib/types/endpoints.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  assertWithValidator,
  tPlatformDetails,
} from 'lib/utils/validation-utils.js';

import { getMessageForException } from './utils.js';
import { deleteCookie } from '../deleters/cookie-deleters.js';
import type { PolicyType } from '../lib/facts/policies.js';
import {
  fetchViewerForJSONRequest,
  addCookieToJSONResponse,
  addCookieToHomeResponse,
  createNewAnonymousCookie,
  setCookiePlatformDetails,
} from '../session/cookies.js';
import type { Viewer } from '../session/viewer.js';
import { getAppURLFactsFromRequestURL } from '../utils/urls.js';
import {
  policiesValidator,
  validateInput,
  validateOutput,
} from '../utils/validation-utils.js';

type InnerJSONResponder = {
  responder: (viewer: Viewer, input: any) => Promise<*>,
  requiredPolicies: $ReadOnlyArray<PolicyType>,
};

export opaque type JSONResponder: InnerJSONResponder = InnerJSONResponder;

function createJSONResponder<I, O>(
  responder: (Viewer, input: I) => Promise<O>,
  inputValidator: TType<I>,
  outputValidator: TType<O>,
  requiredPolicies: $ReadOnlyArray<PolicyType>,
  endpoint: Endpoint,
): JSONResponder {
  return {
    responder: async (viewer, input) => {
      const request = await validateInput(
        viewer,
        inputValidator,
        input,
        endpoint,
      );
      const result = await responder(viewer, request);
      return await validateOutput(
        viewer.platformDetails,
        outputValidator,
        result,
      );
    },
    requiredPolicies,
  };
}

export type DownloadResponder = (
  viewer: Viewer,
  req: $Request,
  res: $Response,
) => Promise<void>;
export type HTTPGetResponder = DownloadResponder;
export type HTMLResponder = (req: $Request, res: $Response) => Promise<void>;

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
      const { input, platformDetails } = req.body;
      viewer = await fetchViewerForJSONRequest(req);

      const promises = [policiesValidator(viewer, responder.requiredPolicies)];

      if (platformDetails) {
        if (!tPlatformDetails.is(platformDetails)) {
          throw new ServerError('invalid_platform_details');
        }
        promises.push(
          setCookiePlatformDetails(
            viewer,
            assertWithValidator(platformDetails, tPlatformDetails),
          ),
        );
      }

      await Promise.all(promises);

      const responderResult = await responder.responder(viewer, input);
      if (res.headersSent) {
        return;
      }
      const result = { ...responderResult };
      addCookieToJSONResponse(viewer, res, result, expectCookieInvalidation);
      res.json({ success: true, ...result });
    } catch (e) {
      await handleException(e, res, viewer, expectCookieInvalidation);
    }
  };
}

type WebhookPayloadResponder = (request: $Request) => Promise<void>;
function webhookPayloadHandler(
  responder: WebhookPayloadResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        throw new ServerError('invalid_parameters');
      }

      const responderResult = await responder(req);

      if (res.headersSent) {
        return;
      }
      res.json({ success: true, ...responderResult });
    } catch (e) {
      await handleException(e, res);
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
      await handleException(e, res, viewer);
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
      await handleException(e, res);
    }
  };
}

async function handleException(
  error: Error,
  res: $Response,
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
    addCookieToJSONResponse(viewer, res, result, !!expectCookieInvalidation);
  }
  res.json(result);
}

function htmlHandler(
  responder: HTMLResponder,
): (req: $Request, res: $Response) => Promise<void> {
  return async (req: $Request, res: $Response) => {
    try {
      addCookieToHomeResponse(
        req,
        res,
        getAppURLFactsFromRequestURL(req.originalUrl),
      );
      res.type('html');
      await responder(req, res);
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
      addCookieToJSONResponse(viewer, res, result, false);
      res.json({ success: true, ...result });
    } catch (e) {
      await handleException(e, res, viewer);
    }
  };
}

export {
  createJSONResponder,
  jsonHandler,
  httpGetHandler,
  downloadHandler,
  htmlHandler,
  uploadHandler,
  webhookPayloadHandler,
};
