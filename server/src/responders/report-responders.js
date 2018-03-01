// @flow

import type {
  ErrorReportCreationResponse,
  ErrorReportCreationRequest,
  FetchErrorReportInfosResponse,
  FetchErrorReportInfosRequest,
} from 'lib/types/report-types';
import type { Viewer } from '../session/viewer';

import t from 'tcomb';

import { ServerError } from 'lib/utils/fetch-utils';

import { tShape } from '../utils/tcomb-utils';
import createErrorReport from '../creators/error-report-creator';
import { fetchErrorReportInfos } from '../fetchers/report-fetchers';

const errorReportCreationRequestInputValidator = tShape({
  deviceType: t.enums.of(['ios', 'android']),
  errors: t.list(tShape({
    errorMessage: t.String,
    componentStack: t.String,
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

export {
  errorReportCreationResponder,
  errorReportFetchInfosResponder,
};
