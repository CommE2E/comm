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
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
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
  +getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
  +getInitialNotificationsEncryptedMessage: (
    keyserverID: string,
  ) => Promise<string>,
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
    input.getSignedIdentityKeysBlob,
  (input: WebGetClientResponsesSelectorInputType) =>
    input.state.navInfo.tab === 'calendar',
  (input: WebGetClientResponsesSelectorInputType) =>
    input.getInitialNotificationsEncryptedMessage,
  (
    getClientResponsesFunc: (
      calendarActive: boolean,
      getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
      getInitialNotificationsEncryptedMessage: (
        keyserverID: string,
      ) => Promise<string>,
      serverRequests: $ReadOnlyArray<ClientServerRequest>,
    ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
    getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
    calendarActive: boolean,
    getInitialNotificationsEncryptedMessage: (
      keyserverID: string,
    ) => Promise<string>,
  ) =>
    (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
      getClientResponsesFunc(
        calendarActive,
        getSignedIdentityKeysBlob,
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
