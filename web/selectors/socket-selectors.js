// @flow

import olm from '@commapp/olm';
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
  IdentityKeysBlob,
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

import { initOlm } from '../olm/olm-utils.js';
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

const getSignedIdentityKeysBlobSelector: (
  state: AppState,
) => ?() => Promise<SignedIdentityKeysBlob> = createSelector(
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

    return async () => {
      await initOlm();
      const primaryOLMAccount = new olm.Account();
      primaryOLMAccount.unpickle(
        primaryAccount.picklingKey,
        primaryAccount.pickledAccount,
      );

      const identityKeysBlob: IdentityKeysBlob = {
        primaryIdentityPublicKeys: primaryIdentityKeys,
        notificationIdentityPublicKeys: notificationIdentityKeys,
      };

      const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
      const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
        payload: payloadToBeSigned,
        signature: primaryOLMAccount.sign(payloadToBeSigned),
      };

      return signedIdentityKeysBlob;
    };
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
  getSignedIdentityKeysBlobSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
};
