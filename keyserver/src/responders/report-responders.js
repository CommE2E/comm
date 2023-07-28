// @flow

import type { $Response, $Request } from 'express';
import t from 'tcomb';
import type { TInterface, TStructProps, TUnion } from 'tcomb';

import {
  type ReportCreationResponse,
  type ReportCreationRequest,
  type FetchErrorReportInfosResponse,
  type FetchErrorReportInfosRequest,
  type ThreadInconsistencyReportShape,
  type EntryInconsistencyReportShape,
  reportTypes,
  reportInfoValidator,
} from 'lib/types/report-types.js';
import { userInfoValidator } from 'lib/types/user-types.js';
import { ServerError } from 'lib/utils/errors.js';
import {
  tShape,
  tPlatform,
  tPlatformDetails,
} from 'lib/utils/validation-utils.js';

import { newEntryQueryInputValidator } from './entry-responders.js';
import createReport from '../creators/report-creator.js';
import {
  fetchErrorReportInfos,
  fetchReduxToolsImport,
} from '../fetchers/report-fetchers.js';
import type { Viewer } from '../session/viewer.js';

const tActionSummary = tShape({
  type: t.String,
  time: t.Number,
  summary: t.String,
});
const threadInconsistencyReportValidatorShape: TStructProps<ThreadInconsistencyReportShape> =
  {
    platformDetails: tPlatformDetails,
    beforeAction: t.Object,
    action: t.Object,
    pollResult: t.maybe(t.Object),
    pushResult: t.Object,
    lastActionTypes: t.maybe(t.list(t.String)),
    lastActions: t.maybe(t.list(tActionSummary)),
    time: t.maybe(t.Number),
  };
const entryInconsistencyReportValidatorShape: TStructProps<EntryInconsistencyReportShape> =
  {
    platformDetails: tPlatformDetails,
    beforeAction: t.Object,
    action: t.Object,
    calendarQuery: newEntryQueryInputValidator,
    pollResult: t.maybe(t.Object),
    pushResult: t.Object,
    lastActionTypes: t.maybe(t.list(t.String)),
    lastActions: t.maybe(t.list(tActionSummary)),
    time: t.Number,
  };
const userInconsistencyReportValidatorShape = {
  platformDetails: tPlatformDetails,
  action: t.Object,
  beforeStateCheck: t.Object,
  afterStateCheck: t.Object,
  lastActions: t.list(tActionSummary),
  time: t.Number,
};

const threadInconsistencyReportCreationRequest = tShape({
  ...threadInconsistencyReportValidatorShape,
  type: t.irreducible(
    'reportTypes.THREAD_INCONSISTENCY',
    x => x === reportTypes.THREAD_INCONSISTENCY,
  ),
});

const entryInconsistencyReportCreationRquest = tShape({
  ...entryInconsistencyReportValidatorShape,
  type: t.irreducible(
    'reportTypes.ENTRY_INCONSISTENCY',
    x => x === reportTypes.ENTRY_INCONSISTENCY,
  ),
});

const mediaMissionReportCreationRequest = tShape({
  type: t.irreducible(
    'reportTypes.MEDIA_MISSION',
    x => x === reportTypes.MEDIA_MISSION,
  ),
  platformDetails: tPlatformDetails,
  time: t.Number,
  mediaMission: t.Object,
  uploadServerID: t.maybe(t.String),
  uploadLocalID: t.maybe(t.String),
  mediaLocalID: t.maybe(t.String),
  messageServerID: t.maybe(t.String),
  messageLocalID: t.maybe(t.String),
});

const userInconsistencyReportCreationRequest = tShape({
  ...userInconsistencyReportValidatorShape,
  type: t.irreducible(
    'reportTypes.USER_INCONSISTENCY',
    x => x === reportTypes.USER_INCONSISTENCY,
  ),
});

export const reportCreationRequestInputValidator: TUnion<ReportCreationRequest> =
  t.union<ReportCreationRequest>([
    tShape({
      type: t.maybe(
        t.irreducible('reportTypes.ERROR', x => x === reportTypes.ERROR),
      ),
      platformDetails: t.maybe(tPlatformDetails),
      deviceType: t.maybe(tPlatform),
      codeVersion: t.maybe(t.Number),
      stateVersion: t.maybe(t.Number),
      errors: t.list(
        tShape({
          errorMessage: t.String,
          stack: t.maybe(t.String),
          componentStack: t.maybe(t.String),
        }),
      ),
      preloadedState: t.Object,
      currentState: t.Object,
      actions: t.list(t.union([t.Object, t.String])),
    }),
    threadInconsistencyReportCreationRequest,
    entryInconsistencyReportCreationRquest,
    mediaMissionReportCreationRequest,
    userInconsistencyReportCreationRequest,
  ]);

export const reportCreationResponseValidator: TInterface<ReportCreationResponse> =
  tShape<ReportCreationResponse>({ id: t.String });

async function reportCreationResponder(
  viewer: Viewer,
  request: ReportCreationRequest,
): Promise<ReportCreationResponse> {
  if (request.type === null || request.type === undefined) {
    request.type = reportTypes.ERROR;
  }
  if (!request.platformDetails && request.deviceType) {
    const { deviceType, codeVersion, stateVersion, ...rest } = request;
    request = {
      ...rest,
      platformDetails: { platform: deviceType, codeVersion, stateVersion },
    };
  }
  const response = await createReport(viewer, request);
  if (!response) {
    throw new ServerError('ignored_report');
  }
  return response;
}

export const reportMultiCreationRequestInputValidator: TInterface<ReportMultiCreationRequest> =
  tShape<ReportMultiCreationRequest>({
    reports: t.list(
      t.union([
        tShape({
          type: t.irreducible(
            'reportTypes.ERROR',
            x => x === reportTypes.ERROR,
          ),
          platformDetails: tPlatformDetails,
          errors: t.list(
            tShape({
              errorMessage: t.String,
              stack: t.maybe(t.String),
              componentStack: t.maybe(t.String),
            }),
          ),
          preloadedState: t.Object,
          currentState: t.Object,
          actions: t.list(t.union([t.Object, t.String])),
        }),
        threadInconsistencyReportCreationRequest,
        entryInconsistencyReportCreationRquest,
        mediaMissionReportCreationRequest,
        userInconsistencyReportCreationRequest,
      ]),
    ),
  });

type ReportMultiCreationRequest = {
  reports: $ReadOnlyArray<ReportCreationRequest>,
};
async function reportMultiCreationResponder(
  viewer: Viewer,
  request: ReportMultiCreationRequest,
): Promise<void> {
  await Promise.all(
    request.reports.map(reportCreationRequest =>
      createReport(viewer, reportCreationRequest),
    ),
  );
}

export const fetchErrorReportInfosRequestInputValidator: TInterface<FetchErrorReportInfosRequest> =
  tShape<FetchErrorReportInfosRequest>({
    cursor: t.maybe(t.String),
  });

export const fetchErrorReportInfosResponseValidator: TInterface<FetchErrorReportInfosResponse> =
  tShape<FetchErrorReportInfosResponse>({
    reports: t.list(reportInfoValidator),
    userInfos: t.list(userInfoValidator),
  });

async function errorReportFetchInfosResponder(
  viewer: Viewer,
  request: FetchErrorReportInfosRequest,
): Promise<FetchErrorReportInfosResponse> {
  return await fetchErrorReportInfos(viewer, request);
}

async function errorReportDownloadResponder(
  viewer: Viewer,
  req: $Request,
  res: $Response,
): Promise<void> {
  const id = req.params.reportID;
  if (!id) {
    throw new ServerError('invalid_parameters');
  }
  const result = await fetchReduxToolsImport(viewer, id);
  res.set('Content-Disposition', `attachment; filename=report-${id}.json`);
  res.json({
    preloadedState: JSON.stringify(result.preloadedState),
    payload: JSON.stringify(result.payload),
  });
}

export {
  threadInconsistencyReportValidatorShape,
  entryInconsistencyReportValidatorShape,
  reportCreationResponder,
  reportMultiCreationResponder,
  errorReportFetchInfosResponder,
  errorReportDownloadResponder,
};
