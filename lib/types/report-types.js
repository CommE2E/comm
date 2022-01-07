// @flow

import invariant from 'invariant';
import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils';
import { type PlatformDetails, platformDetailsValidator } from './device-types';
import { type RawEntryInfo, type CalendarQuery } from './entry-types';
import { type MediaMission } from './media-types';
import type { AppState, BaseAction } from './redux-types';
import { type RawThreadInfo } from './thread-types';
import { type UserInfo, type UserInfos, userInfoValidator } from './user-types';

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
  +beforeAction: { +[id: string]: RawThreadInfo },
  +action: BaseAction,
  +pollResult?: { +[id: string]: RawThreadInfo },
  +pushResult: { +[id: string]: RawThreadInfo },
  +lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  +lastActions?: $ReadOnlyArray<ActionSummary>,
  +time?: number,
};
export type EntryInconsistencyReportShape = {
  +platformDetails: PlatformDetails,
  +beforeAction: { +[id: string]: RawEntryInfo },
  +action: BaseAction,
  +calendarQuery: CalendarQuery,
  +pollResult?: { +[id: string]: RawEntryInfo },
  +pushResult: { +[id: string]: RawEntryInfo },
  +lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  +lastActions?: $ReadOnlyArray<ActionSummary>,
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

type ErrorReportCreationRequest = {
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
  +beforeAction: { +[id: string]: RawThreadInfo },
  +action: BaseAction,
  +pushResult: { +[id: string]: RawThreadInfo },
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

export type ClientThreadInconsistencyReportCreationRequest = {
  ...ClientThreadInconsistencyReportShape,
  +type: 1,
};
export type ClientEntryInconsistencyReportCreationRequest = {
  ...ClientEntryInconsistencyReportShape,
  +type: 2,
};

export type ClientReportCreationRequest =
  | ErrorReportCreationRequest
  | ClientThreadInconsistencyReportCreationRequest
  | ClientEntryInconsistencyReportCreationRequest
  | MediaMissionReportCreationRequest
  | UserInconsistencyReportCreationRequest;

export type QueueReportsPayload = {
  +reports: $ReadOnlyArray<ClientReportCreationRequest>,
};

export type ClearDeliveredReportsPayload = {
  +reports: $ReadOnlyArray<ClientReportCreationRequest>,
};

export type ReportCreationResponse = {
  +id: string,
};
export const reportCreationResponseValidator: TInterface = tShape({
  id: t.String,
});

type ReportInfo = {
  +id: string,
  +viewerID: string,
  +platformDetails: PlatformDetails,
  +creationTime: number,
};
export const reportInfoValidator: TInterface = tShape({
  id: t.String,
  viewerID: t.String,
  platformDetails: platformDetailsValidator,
  creationTime: t.Number,
});

export type FetchErrorReportInfosRequest = {
  +cursor: ?string,
};

export type FetchErrorReportInfosResponse = {
  +reports: $ReadOnlyArray<ReportInfo>,
  +userInfos: $ReadOnlyArray<UserInfo>,
};
export const fetchErrorReportInfosResponseValidator: TInterface = tShape({
  reports: t.list(reportInfoValidator),
  userInfos: t.list(userInfoValidator),
});

export type ReduxToolsImport = {
  +preloadedState: AppState,
  +payload: $ReadOnlyArray<BaseAction>,
};
