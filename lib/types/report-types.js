// @flow

import type { BaseAppState, BaseAction } from './redux-types';
import type { UserInfo } from './user-types';
import type { DeviceType } from './device-types';

export type ErrorInfo = { componentStack: string };
export type ErrorData = {| error: Error, info?: ErrorInfo |};
export type FlatErrorData = {|
  errorMessage: string,
  componentStack?: ?string,
|};

export type ErrorReportCreationRequest = {|
  deviceType: DeviceType,
  errors: $ReadOnlyArray<FlatErrorData>,
  preloadedState: BaseAppState<*>,
  currentState: BaseAppState<*>,
  actions: $ReadOnlyArray<BaseAction>,
  codeVersion: number,
  stateVersion: number,
|};

export type ErrorReportCreationResponse = {|
  id: string,
|};

export type ErrorReportInfo = {|
  id: string,
  viewerID: string,
  deviceType: DeviceType,
  creationTime: number,
  codeVersion: number,
  stateVersion: number,
|};

export type FetchErrorReportInfosRequest = {|
  cursor: ?string,
|};

export type FetchErrorReportInfosResponse = {|
  reports: $ReadOnlyArray<ErrorReportInfo>,
  userInfos: $ReadOnlyArray<UserInfo>,
|};

export type ErrorReport = {|
  ...ErrorReportCreationRequest,
  viewerID: string,
  creationTime: number,
  id: string,
|};

export type ReduxToolsImport = {|
  preloadedState: BaseAppState<*>,
  payload: $ReadOnlyArray<BaseAction>,
|};
