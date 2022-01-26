// @flow

import { createSelector } from 'reselect';

import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors';
import { createOpenSocketFunction } from 'lib/shared/socket-utils';
import type {
  ClientServerRequest,
  ClientClientResponse,
} from 'lib/types/request-types';
import type {
  SessionIdentification,
  SessionState,
} from 'lib/types/session-types';
import type {
  OneTimeKeyGenerator,
  PublicKeyGetter,
} from 'lib/types/socket-types';

import type { AppState } from '../redux/redux-setup';

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
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => $ReadOnlyArray<ClientClientResponse> = createSelector(
  getClientResponsesSelector,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
    getClientResponsesFunc: (
      calendarActive: boolean,
      oneTimeKeyGenerator: ?OneTimeKeyGenerator,
      publicKeyGetter: ?PublicKeyGetter,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ) => $ReadOnlyArray<ClientClientResponse>,
    calendarActive: boolean,
  ) => (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
    getClientResponsesFunc(calendarActive, null, null, serverRequests),
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
