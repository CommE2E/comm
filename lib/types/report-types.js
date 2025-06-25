// @flow

import invariant from 'invariant';
import t, { type TInterface, type TStructProps } from 'tcomb';

import { type PlatformDetails } from './device-types.js';
import {
  type RawEntryInfo,
  type CalendarQuery,
  calendarQueryValidator,
} from './entry-types.js';
import { type MediaMission } from './media-types.js';
import type { AppState, BaseAction } from './redux-types.js';
import { type MixedRawThreadInfos } from './thread-types.js';
import type { UserInfo, UserInfos } from './user-types.js';
import {
  tPlatformDetails,
  tShape,
  tUserID,
} from '../utils/validation-utils.js';

export type EnabledReports = {
  +crashReports: boolean,
  +inconsistencyReports: boolean,
  +mediaReports: boolean,
};

export type SupportedReports = $Keys<EnabledReports>;

export const defaultEnabledReports: EnabledReports = {
  crashReports: false,
  inconsistencyReports: false,
  mediaReports: false,
};

export const defaultDevEnabledReports: EnabledReports = {
  crashReports: true,
  inconsistencyReports: true,
  mediaReports: true,
};

export type ReportStore = {
  +enabledReports: EnabledReports,
  +queuedReports: $ReadOnlyArray<ClientReportCreationRequest>,
};

export const reportTypes = Object.freeze({
  ERROR: 0,
  THREAD_INCONSISTENCY: 1,
  ENTRY_INCONSISTENCY: 2,
  MEDIA_MISSION: 3,
  USER_INCONSISTENCY: 4,
});
type ReportType = $Values<typeof reportTypes>;
export function assertReportType(reportType: number): ReportType {
  invariant(
    reportType === 0 ||
      reportType === 1 ||
      reportType === 2 ||
      reportType === 3 ||
      reportType === 4,
    'number is not ReportType enum',
  );
  return reportType;
}

export type ErrorInfo = { componentStack: string, ... };
export type ErrorData = { error: Error, info?: ErrorInfo };
export type FlatErrorData = {
  errorMessage: string,
  stack?: string,
  componentStack?: ?string,
};

export type ActionSummary = {
  +type: $PropertyType<BaseAction, 'type'>,
  +time: number,
  +summary: string,
};
export type ThreadInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +beforeAction: MixedRawThreadInfos,
  +action: BaseAction,
  +pollResult?: ?MixedRawThreadInfos,
  +pushResult: MixedRawThreadInfos,
  +lastActionTypes?: ?$ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  +lastActions?: ?$ReadOnlyArray<ActionSummary>,
  +time?: ?number,
};
export type EntryInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +beforeAction: { +[id: string]: RawEntryInfo },
  +action: BaseAction,
  +calendarQuery: CalendarQuery,
  +pollResult?: ?{ +[id: string]: RawEntryInfo },
  +pushResult: { +[id: string]: RawEntryInfo },
  +lastActionTypes?: ?$ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  +lastActions?: ?$ReadOnlyArray<ActionSummary>,
  +time: number,
};
export type UserInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +action: BaseAction,
  +beforeStateCheck: UserInfos,
  +afterStateCheck: UserInfos,
  +lastActions: $ReadOnlyArray<ActionSummary>,
  +time: number,
};

export type ErrorReportCreationRequest = {
  +type: 0,
  +platformDetails: PlatformDetails,
  +errors: $ReadOnlyArray<FlatErrorData>,
  +preloadedState: AppState,
  +currentState: AppState,
  +actions: $ReadOnlyArray<BaseAction>,
};
export type ThreadInconsistencyReportCreationRequest = {
  ...ThreadInconsistencyReportShape,
  +type: 1,
};
export type EntryInconsistencyReportCreationRequest = {
  ...EntryInconsistencyReportShape,
  +type: 2,
};
export type MediaMissionReportCreationRequest = {
  +type: 3,
  +platformDetails: PlatformDetails,
  +time: number, // ms
  +mediaMission: MediaMission,
  +uploadServerID?: ?string,
  +uploadLocalID?: ?string,
  +mediaLocalID?: ?string, // deprecated
  +messageServerID?: ?string,
  +messageLocalID?: ?string,
};
export type UserInconsistencyReportCreationRequest = {
  ...UserInconsistencyReportShape,
  +type: 4,
};
export type ReportCreationRequest =
  | ErrorReportCreationRequest
  | ThreadInconsistencyReportCreationRequest
  | EntryInconsistencyReportCreationRequest
  | MediaMissionReportCreationRequest
  | UserInconsistencyReportCreationRequest;

export type ClientThreadInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +beforeAction: MixedRawThreadInfos,
  +action: BaseAction,
  +pushResult: MixedRawThreadInfos,
  +lastActions: $ReadOnlyArray<ActionSummary>,
  +time: number,
};
export type ClientEntryInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +beforeAction: { +[id: string]: RawEntryInfo },
  +action: BaseAction,
  +calendarQuery: CalendarQuery,
  +pushResult: { +[id: string]: RawEntryInfo },
  +lastActions: $ReadOnlyArray<ActionSummary>,
  +time: number,
};

export type ClientErrorReportCreationRequest = {
  ...ErrorReportCreationRequest,
  +id: string,
};
export type ClientThreadInconsistencyReportCreationRequest = {
  ...ClientThreadInconsistencyReportShape,
  +type: 1,
  +id: string,
};
export type ClientEntryInconsistencyReportCreationRequest = {
  ...ClientEntryInconsistencyReportShape,
  +type: 2,
  +id: string,
};
export type ClientMediaMissionReportCreationRequest = {
  ...MediaMissionReportCreationRequest,
  +id: string,
};
export type ClientUserInconsistencyReportCreationRequest = {
  ...UserInconsistencyReportCreationRequest,
  +id: string,
};

export type ClientReportCreationRequest =
  | ClientErrorReportCreationRequest
  | ClientThreadInconsistencyReportCreationRequest
  | ClientEntryInconsistencyReportCreationRequest
  | ClientMediaMissionReportCreationRequest
  | ClientUserInconsistencyReportCreationRequest;

export type QueueReportsPayload = {
  +reports: $ReadOnlyArray<ClientReportCreationRequest>,
};

export type ClearDeliveredReportsPayload = {
  +reports: $ReadOnlyArray<ClientReportCreationRequest>,
};

export type ReportCreationResponse = {
  +id: string,
};

// Reports Service specific types
export type ReportsServiceSendReportsRequest =
  | ClientReportCreationRequest
  | $ReadOnlyArray<ClientReportCreationRequest>;
export type ReportsServiceSendReportsResponse = {
  +reportIDs: $ReadOnlyArray<string>,
};
export type ReportsServiceSendReportsAction = (
  request: ReportsServiceSendReportsRequest,
) => Promise<ReportsServiceSendReportsResponse>;

// Keyserver specific types
type ReportInfo = {
  +id: string,
  +viewerID: string,
  +platformDetails: PlatformDetails,
  +creationTime: number,
};

export const reportInfoValidator: TInterface<ReportInfo> = tShape<ReportInfo>({
  id: t.String,
  viewerID: tUserID,
  platformDetails: tPlatformDetails,
  creationTime: t.Number,
});

export type FetchErrorReportInfosRequest = {
  +cursor: ?string,
};

export type FetchErrorReportInfosResponse = {
  +reports: $ReadOnlyArray<ReportInfo>,
  +userInfos: $ReadOnlyArray<UserInfo>,
};

export type ReduxToolsImport = {
  +preloadedState: AppState,
  +payload: $ReadOnlyArray<BaseAction>,
};

const tActionType = t.irreducible<$PropertyType<BaseAction, 'type'>>(
  'ActionType',
  x => typeof x === 'string',
);

const tActionSummary = tShape<ActionSummary>({
  type: tActionType,
  time: t.Number,
  summary: t.String,
});

export const threadInconsistencyReportValidatorShape: TStructProps<ThreadInconsistencyReportShape> =
  {
    platformDetails: tPlatformDetails,
    beforeAction: t.Object,
    action: t.Object,
    pollResult: t.maybe(t.Object),
    pushResult: t.Object,
    lastActionTypes: t.maybe(t.list(tActionType)),
    lastActions: t.maybe(t.list(tActionSummary)),
    time: t.maybe(t.Number),
  };
export const entryInconsistencyReportValidatorShape: TStructProps<EntryInconsistencyReportShape> =
  {
    platformDetails: tPlatformDetails,
    beforeAction: t.Object,
    action: t.Object,
    calendarQuery: calendarQueryValidator,
    pollResult: t.maybe(t.Object),
    pushResult: t.Object,
    lastActionTypes: t.maybe(t.list(tActionType)),
    lastActions: t.maybe(t.list(tActionSummary)),
    time: t.Number,
  };
export const userInconsistencyReportValidatorShape: TStructProps<UserInconsistencyReportShape> =
  {
    platformDetails: tPlatformDetails,
    action: t.Object,
    beforeStateCheck: t.Object,
    afterStateCheck: t.Object,
    lastActions: t.list(tActionSummary),
    time: t.Number,
  };
