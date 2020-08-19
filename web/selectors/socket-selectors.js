// @flow

import type { AppState } from '../redux/redux-setup';
import type {
  SessionIdentification,
  SessionState,
} from 'lib/types/session-types';
import type {
  ServerRequest,
  ClientClientResponse,
} from 'lib/types/request-types';

import { createSelector } from 'reselect';

import { createOpenSocketFunction } from 'lib/shared/socket-utils';
import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors';

const openSocketSelector: (state: AppState) => () => WebSocket = createSelector(
  (state: AppState) => state.baseHref,
  createOpenSocketFunction,
);

const sessionIdentificationSelector: (
  state: AppState,
) => SessionIdentification = createSelector(
  (state: AppState) => state.sessionID,
  (sessionID: ?string): SessionIdentification => ({ sessionID }),
);

const webGetClientResponsesSelector: (
  state: AppState,
) => (
  serverRequests: $ReadOnlyArray<ServerRequest>,
) => $ReadOnlyArray<ClientClientResponse> = createSelector(
  getClientResponsesSelector,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    getClientResponsesFunc: (
      calendarActive: boolean,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    ) => $ReadOnlyArray<ClientClientResponse>,
    calendarActive: boolean,
  ) => (serverRequests: $ReadOnlyArray<ServerRequest>) =>
    getClientResponsesFunc(calendarActive, serverRequests),
);

const webSessionStateFuncSelector: (
  state: AppState,
) => () => SessionState = createSelector(
  sessionStateFuncSelector,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    sessionStateFunc: (calendarActive: boolean) => SessionState,
    calendarActive: boolean,
  ) => () => sessionStateFunc(calendarActive),
);

export {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
};
