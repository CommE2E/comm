// @flow

import type { AppState, BaseAction } from './redux-types';
import type { UserInfo } from './user-types';
import type { PlatformDetails } from './device-types';
import type { RawThreadInfo } from './thread-types';
import type { RawEntryInfo, CalendarQuery } from './entry-types';

import invariant from 'invariant';

export const reportTypes = Object.freeze({
  ERROR: 0,
  THREAD_INCONSISTENCY: 1,
  ENTRY_INCONSISTENCY: 2,
});
type ReportType = $Values<typeof reportTypes>;
function assertReportType(reportType: number): ReportType {
  invariant(
    reportType === 0 ||
      reportType === 1 ||
      reportType === 2,
    "number is not ReportType enum",
  );
  return reportType;
}

export type ErrorInfo = { componentStack: string };
export type ErrorData = {| error: Error, info?: ErrorInfo |};
export type FlatErrorData = {|
  errorMessage: string,
  stack?: string,
  componentStack?: ?string,
|};

export type ActionSummary = {|
  type: $PropertyType<BaseAction, 'type'>,
  time: number,
  summary: string,
|};
export type ThreadInconsistencyReportShape = {|
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  pollResult: {[id: string]: RawThreadInfo},
  pushResult: {[id: string]: RawThreadInfo},
  lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  lastActions?: $ReadOnlyArray<ActionSummary>,
  time?: number,
|};
export type EntryInconsistencyReportShape = {|
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  calendarQuery: CalendarQuery,
  pollResult: {[id: string]: RawEntryInfo},
  pushResult: {[id: string]: RawEntryInfo},
  lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
  lastActions?: $ReadOnlyArray<ActionSummary>,
  time: number,
|};

type ErrorReportCreationRequest = {|
  type: 0,
  platformDetails: PlatformDetails,
  errors: $ReadOnlyArray<FlatErrorData>,
  preloadedState: AppState,
  currentState: AppState,
  actions: $ReadOnlyArray<BaseAction>,
|};
export type ThreadInconsistencyReportCreationRequest = {|
  ...ThreadInconsistencyReportShape,
  type: 1,
|};
export type EntryInconsistencyReportCreationRequest = {|
  ...EntryInconsistencyReportShape,
  type: 2,
|};
export type ReportCreationRequest =
  | ErrorReportCreationRequest
  | ThreadInconsistencyReportCreationRequest
  | EntryInconsistencyReportCreationRequest;

export type ClientThreadInconsistencyReportShape = {|
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  pollResult: {[id: string]: RawThreadInfo},
  pushResult: {[id: string]: RawThreadInfo},
  lastActions: $ReadOnlyArray<ActionSummary>,
  time: number,
|};
export type ClientEntryInconsistencyReportShape = {|
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawEntryInfo},
  action: BaseAction,
  calendarQuery: CalendarQuery,
  pollResult: {[id: string]: RawEntryInfo},
  pushResult: {[id: string]: RawEntryInfo},
  lastActions: $ReadOnlyArray<ActionSummary>,
  time: number,
|};
export type ClientReportCreationRequest =
  | ErrorReportCreationRequest
  | {| ...ClientThreadInconsistencyReportShape, type: 1 |}
  | {| ...EntryInconsistencyReportShape, type: 2 |};

export type ReportCreationResponse = {|
  id: string,
|};

type ReportInfo = {|
  id: string,
  viewerID: string,
  platformDetails: PlatformDetails,
  creationTime: number,
|};

export type FetchErrorReportInfosRequest = {|
  cursor: ?string,
|};

export type FetchErrorReportInfosResponse = {|
  reports: $ReadOnlyArray<ReportInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type ReduxToolsImport = {|
  preloadedState: AppState,
  payload: $ReadOnlyArray<BaseAction>,
|};
