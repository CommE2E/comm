// @flow

import type {
  ErrorReportCreationResponse,
  ErrorReportCreationRequest,
  FetchErrorReportInfosResponse,
  FetchErrorReportInfosRequest,
} from 'lib/types/report-types';
import type { Viewer } from '../session/viewer';
import type { $Response, $Request } from 'express';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import createErrorReport from '../creators/error-report-creator';
import {
  fetchErrorReportInfos,
  fetchReduxToolsImport,
} from '../fetchers/report-fetchers';
import { fetchViewerForJSONRequest } from '../session/cookies';

const errorReportCreationRequestInputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  errors: t.list(tShape({
    errorMessage: t.String,
    componentStack: t.maybe(t.String),
  })),
  preloadedState: t.Object,
  currentState: t.Object,
  actions: t.list(t.Object),
  codeVersion: t.Number,
  stateVersion: t.Number,
});

async function errorReportCreationResponder(
  viewer: Viewer,
  input: any,
): Promise<ErrorReportCreationResponse> {
  const request: ErrorReportCreationRequest = input;
  if (!errorReportCreationRequestInputValidator.is(request)) {
    throw new ServerError('invalid_parameters');
  }
  return await createErrorReport(viewer, request);
}

const fetchErrorReportInfosRequestInputValidator = tShape({
  cursor: t.maybe(t.String),
});

async function errorReportFetchInfosResponder(
  viewer: Viewer,
  input: any,
): Promise<FetchErrorReportInfosResponse> {
  const request: FetchErrorReportInfosRequest = input;
  if (!fetchErrorReportInfosRequestInputValidator.is(request)) {
    throw new ServerError('invalid_parameters');
  }
  return await fetchErrorReportInfos(viewer, request);
}

async function errorReportDownloadHandler(
  req: $Request,
  res: $Response,
): Promise<void> {
  try {
    const viewer = await fetchViewerForJSONRequest(req);
    const id = req.params.reportID;
    if (!id) {
      throw new ServerError('invalid_parameters');
    }
    const result = await fetchReduxToolsImport(viewer, id);
    res.set("Content-Disposition", `attachment; filename=report-${id}.json`);
    res.json({
      preloadedState: JSON.stringify(result.preloadedState),
      payload: JSON.stringify(result.payload),
    });
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
}

export {
  errorReportCreationResponder,
  errorReportFetchInfosResponder,
  errorReportDownloadHandler,
};
