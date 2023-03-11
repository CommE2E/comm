// @flow

import olm from '@matrix-org/olm';
import { createSelector } from 'reselect';

import {
  getClientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors.js';
import { createOpenSocketFunction } from 'lib/shared/socket-utils.js';
import type {
  OLMIdentityKeys,
  PickledOLMAccount,
  SignedIdentityKeysBlob,
} from 'lib/types/crypto-types.js';
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

const signedIdentityKeysBlobSelector: (
  state: AppState,
) => ?SignedIdentityKeysBlob = createSelector(
  (state: AppState) => state.cryptoStore.primaryAccount,
  (state: AppState) => state.cryptoStore.primaryIdentityKeys,
  (state: AppState) => state.cryptoStore.notificationIdentityKeys,
  (
    primaryAccount: ?PickledOLMAccount,
    primaryIdentityKeys: ?OLMIdentityKeys,
    notificationIdentityKeys: ?OLMIdentityKeys,
  ) => {
    if (!primaryAccount || !primaryIdentityKeys || !notificationIdentityKeys) {
      return null;
    }

    const primaryOLMAccount = new olm.Account();
    primaryOLMAccount.unpickle(
      primaryAccount.picklingKey,
      primaryAccount.pickledAccount,
    );

    const payloadToBeSigned = JSON.stringify({
      primaryIdentityKeys,
      notificationIdentityKeys,
    });

    const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
      payload: payloadToBeSigned,
      signature: primaryOLMAccount.sign(payloadToBeSigned),
    };

    return signedIdentityKeysBlob;
  },
);

const getSignedIdentityKeysBlobSelector: (
  state: AppState,
) => ?() => Promise<SignedIdentityKeysBlob> = createSelector(
  signedIdentityKeysBlobSelector,
  (signedIdentityKeysBlob: ?SignedIdentityKeysBlob) => {
    if (!signedIdentityKeysBlob) {
      return null;
    }
    return async () => signedIdentityKeysBlob;
  },
);

const webGetClientResponsesSelector: (
  state: AppState,
) => (
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  getClientResponsesSelector,
  getSignedIdentityKeysBlobSelector,
  (state: AppState) => state.navInfo.tab === 'calendar',
  (
      getClientResponsesFunc: (
        calendarActive: boolean,
        oneTimeKeyGenerator: ?OneTimeKeyGenerator,
        getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob>,
        serverRequests: $ReadOnlyArray<ClientServerRequest>,
      ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
      getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob>,
      calendarActive: boolean,
    ) =>
    (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
      getClientResponsesFunc(
        calendarActive,
        null,
        getSignedIdentityKeysBlob,
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
