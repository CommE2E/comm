// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  sessionIDSelector,
  cookieSelector,
} from 'lib/selectors/keyserver-selectors.js';
import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors.js';
import type {
  ClientServerRequest,
  ClientClientResponse,
} from 'lib/types/request-types.js';
import type {
  SessionIdentification,
  SessionState,
} from 'lib/types/session-types.js';

import type { AppState } from '../redux/redux-setup.js';

const baseSessionIdentificationSelector: (
  keyserverID: string,
) => (state: AppState) => SessionIdentification = keyserverID =>
  createSelector(
    cookieSelector(keyserverID),
    sessionIDSelector(keyserverID),
    (cookie: ?string, sessionID: ?string): SessionIdentification => ({
      cookie,
      sessionID,
    }),
  );

const sessionIdentificationSelector: (
  keyserverID: string,
) => (state: AppState) => SessionIdentification = _memoize(
  baseSessionIdentificationSelector,
);

type WebGetClientResponsesSelectorInputType = {
  +state: AppState,
  +getInitialNotificationsEncryptedMessage: () => Promise<string>,
  +keyserverID: string,
};

const webGetClientResponsesSelector: (
  input: WebGetClientResponsesSelectorInputType,
) => (
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  (input: WebGetClientResponsesSelectorInputType) =>
    getClientResponsesSelector(input.state, input.keyserverID),
  (input: WebGetClientResponsesSelectorInputType) =>
    input.state.navInfo.tab === 'calendar',
  (input: WebGetClientResponsesSelectorInputType) =>
    input.getInitialNotificationsEncryptedMessage,
  (
    getClientResponsesFunc: (
      calendarActive: boolean,
      getInitialNotificationsEncryptedMessage: () => Promise<string>,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
    calendarActive: boolean,
    getInitialNotificationsEncryptedMessage: () => Promise<string>,
  ) =>
    (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
      getClientResponsesFunc(
        calendarActive,
        getInitialNotificationsEncryptedMessage,
        serverRequests,
      ),
);

const baseWebSessionStateFuncSelector: (
  keyserverID: string,
) => (state: AppState) => () => SessionState = keyserverID =>
  createSelector(
    sessionStateFuncSelector(keyserverID),
    (state: AppState) => state.navInfo.tab === 'calendar',
    (
      sessionStateFunc: (calendarActive: boolean) => SessionState,
      calendarActive: boolean,
    ) =>
      () =>
        sessionStateFunc(calendarActive),
  );

const webSessionStateFuncSelector: (
  keyserverID: string,
) => (state: AppState) => () => SessionState = _memoize(
  baseWebSessionStateFuncSelector,
);

export {
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
};
