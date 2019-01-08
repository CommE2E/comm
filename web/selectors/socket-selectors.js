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

const openSocketSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.baseHref,
  createOpenSocketFunction,
);

const sessionIdentificationSelector = createSelector<*, *, *, *>(
  (state: AppState) => state.sessionID,
  (sessionID: ?string): SessionIdentification => ({ sessionID }),
);

const webGetClientResponsesSelector = createSelector<*, *, *, *, *>(
  getClientResponsesSelector,
  (state: AppState) => state.navInfo.tab === "calendar",
  (
    getClientResponsesFunc: (
      calendarActive: bool,
      serverRequests: $ReadOnlyArray<ServerRequest>,
    ) => $ReadOnlyArray<ClientResponse>,
    calendarActive: bool,
  ) => (serverRequests: $ReadOnlyArray<ServerRequest>) =>
    getClientResponsesFunc(calendarActive, serverRequests),
);

const webSessionStateFuncSelector = createSelector<*, *, *, *, *>(
  sessionStateFuncSelector,
  (state: AppState) => state.navInfo.tab === "calendar",
  (
    sessionStateFunc: (calendarActive: bool) => SessionState,
    calendarActive: bool,
  ) => () => sessionStateFunc(calendarActive),
);

export {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
};
