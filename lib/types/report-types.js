// @flow

import type { BaseAppState, BaseAction } from './redux-types';
import type { UserInfo } from './user-types';
import type { PlatformDetails } from './device-types';
import type { RawThreadInfo } from './thread-types';

import invariant from 'invariant';

export const reportTypes = Object.freeze({
  ERROR: 0,
  THREAD_POLL_PUSH_INCONSISTENCY: 1,
});
type ReportType = $Values<typeof reportTypes>;
function assertReportType(reportType: number): ReportType {
  invariant(
    reportType === 0 ||
      reportType === 1,
    "number is not ReportType enum",
  );
  return reportType;
}

export type ErrorInfo = { componentStack: string };
export type ErrorData = {| error: Error, info?: ErrorInfo |};
export type FlatErrorData = {|
  errorMessage: string,
  componentStack?: ?string,
|};

type ErrorReportCreationRequest = {|
  type: 0,
  platformDetails: PlatformDetails,
  errors: $ReadOnlyArray<FlatErrorData>,
  preloadedState: BaseAppState<*>,
  currentState: BaseAppState<*>,
  actions: $ReadOnlyArray<BaseAction>,
|};
export type ThreadPollPushInconsistencyReportCreationRequest = {|
  type: 1,
  platformDetails: PlatformDetails,
  beforeAction: {[id: string]: RawThreadInfo},
  action: BaseAction,
  pollResult: {[id: string]: RawThreadInfo},
  pushResult: {[id: string]: RawThreadInfo},
  lastActionTypes?: $ReadOnlyArray<$PropertyType<BaseAction, 'type'>>,
|};
export type ReportCreationRequest =
  | ErrorReportCreationRequest
  | ThreadPollPushInconsistencyReportCreationRequest;

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
  preloadedState: BaseAppState<*>,
  payload: $ReadOnlyArray<BaseAction>,
|};
