// @flow

import type { AppState } from '../redux-setup';
import type {
  SessionIdentification,
  SessionState,
} from 'lib/types/session-types';
import type { ServerRequest, ClientResponse } from 'lib/types/request-types';

import { createSelector } from 'reselect';

import { createOpenSocketFunction } from 'lib/shared/socket-utils';
import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors';

import { calendarActiveSelector } from './nav-selectors';

const openSocketSelector = createSelector(
  (state: AppState) => state.urlPrefix,
  // We don't actually use the cookie in the socket open function, but we do use
  // it in the initial message, and when the cookie changes the socket needs to
  // be reopened. By including the cookie here, whenever the cookie changes this
  // function will change, which tells the Socket component to restart the
  // connection.
  (state: AppState) => state.cookie,
  createOpenSocketFunction,
);

const sessionIdentificationSelector = createSelector(
  (state: AppState) => state.cookie,
  (cookie: ?string): SessionIdentification => ({ cookie }),
);

const nativeGetClientResponsesSelector = createSelector(
  getClientResponsesSelector,
  calendarActiveSelector,
  (
    getClientResponsesFunc: (
      calendarActive: bool,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    ) => $ReadOnlyArray<ClientResponse>,
    calendarActive: bool,
  ) => (serverRequests: $ReadOnlyArray<ServerRequest>) =>
    getClientResponsesFunc(calendarActive, serverRequests),
);

const nativeSessionStateFuncSelector = createSelector(
  sessionStateFuncSelector,
  calendarActiveSelector,
  (
    sessionStateFunc: (calendarActive: bool) => SessionState,
    calendarActive: bool,
  ) => () => sessionStateFunc(calendarActive),
);

export {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
};
