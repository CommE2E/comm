// @flow

import { createSelector } from 'reselect';

import {
  sessionIDSelector,
  urlPrefixSelector,
  cookieSelector,
} from 'lib/selectors/keyserver-selectors.js';
import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors.js';
import { createOpenSocketFunction } from 'lib/shared/socket-utils.js';
import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';
import type {
  ClientServerRequest,
  ClientClientResponse,
} from 'lib/types/request-types.js';
import type {
  SessionIdentification,
  SessionState,
} from 'lib/types/session-types.js';
import type { OneTimeKeyGenerator } from 'lib/types/socket-types.js';

import type { AppState } from '../redux/redux-setup.js';

const openSocketSelector: (state: AppState) => ?() => WebSocket =
  createSelector(urlPrefixSelector, (urlPrefix: ?string) => {
    if (!urlPrefix) {
      return null;
    }
    return createOpenSocketFunction(urlPrefix);
  });

const sessionIdentificationSelector: (
  state: AppState,
) => SessionIdentification = createSelector(
  cookieSelector,
  sessionIDSelector,
  (cookie: ?string, sessionID: ?string): SessionIdentification => ({
    cookie,
    sessionID,
  }),
);

type WebGetClientResponsesSelectorInputType = {
  state: AppState,
  getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
};

const webGetClientResponsesSelector: (
  input: WebGetClientResponsesSelectorInputType,
) => (
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  (input: WebGetClientResponsesSelectorInputType) =>
    getClientResponsesSelector(input.state),
  (input: WebGetClientResponsesSelectorInputType) =>
    input.getSignedIdentityKeysBlob,
  (input: WebGetClientResponsesSelectorInputType) =>
    input.state.navInfo.tab === 'calendar',
  (
      getClientResponsesFunc: (
        calendarActive: boolean,
        oneTimeKeyGenerator: ?OneTimeKeyGenerator,
        getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
        getInitialNotificationsEncryptedMessage: ?() => Promise<string>,
        serverRequests: $ReadOnlyArray<ClientServerRequest>,
      ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
      getSignedIdentityKeysBlob: () => Promise<SignedIdentityKeysBlob>,
      calendarActive: boolean,
    ) =>
    (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
      getClientResponsesFunc(
        calendarActive,
        null,
        getSignedIdentityKeysBlob,
        null,
        serverRequests,
      ),
);

const webSessionStateFuncSelector: (state: AppState) => () => SessionState =
  createSelector(
    sessionStateFuncSelector,
    (state: AppState) => state.navInfo.tab === 'calendar',
    (
        sessionStateFunc: (calendarActive: boolean) => SessionState,
        calendarActive: boolean,
      ) =>
      () =>
        sessionStateFunc(calendarActive),
  );

export {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
};
