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

import { ServerError } from 'lib/utils/errors';

import { validateInput, tShape } from '../utils/validation-utils';
import createErrorReport from '../creators/error-report-creator';
import {
  fetchErrorReportInfos,
  fetchReduxToolsImport,
} from '../fetchers/report-fetchers';

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
  validateInput(errorReportCreationRequestInputValidator, request);
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
  validateInput(fetchErrorReportInfosRequestInputValidator, request);
  return await fetchErrorReportInfos(viewer, request);
}

async function errorReportDownloadHandler(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
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
}

export {
  errorReportCreationResponder,
  errorReportFetchInfosResponder,
  errorReportDownloadHandler,
};
