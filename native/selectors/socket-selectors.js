// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import {
  cookieSelector,
  urlPrefixSelector,
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

import { commCoreModule } from '../native-modules.js';
import { calendarActiveSelector } from '../navigation/nav-selectors.js';
import type { AppState } from '../redux/state-types.js';
import type { NavPlusRedux } from '../types/selector-types.js';

const baseOpenSocketSelector: (
  keyserverID: string,
) => (state: AppState) => ?() => WebSocket = keyserverID =>
  createSelector(
    urlPrefixSelector(keyserverID),
    // We don't actually use the cookie in the socket open function,
    // but we do use it in the initial message, and when the cookie changes
    // the socket needs to be reopened. By including the cookie here,
    // whenever the cookie changes this function will change,
    // which tells the Socket component to restart the connection.
    cookieSelector,
    (urlPrefix: ?string) => {
      if (!urlPrefix) {
        return null;
      }
      return createOpenSocketFunction(urlPrefix);
    },
  );

const openSocketSelector: (
  keyserverID: string,
) => (state: AppState) => ?() => WebSocket = _memoize(baseOpenSocketSelector);

const sessionIdentificationSelector: (
  state: AppState,
) => SessionIdentification = createSelector(
  cookieSelector,
  (cookie: ?string): SessionIdentification => ({ cookie }),
);

function oneTimeKeyGenerator(inc: number): string {
  // todo replace this hard code with something like
  // commCoreModule.generateOneTimeKeys()
  let str = Date.now().toString() + '_' + inc.toString() + '_';
  while (str.length < 43) {
    str += Math.random().toString(36).substr(2, 5);
  }
  str = str.substr(0, 43);
  return str;
}

async function getSignedIdentityKeysBlob(): Promise<SignedIdentityKeysBlob> {
  await commCoreModule.initializeCryptoAccount();
  const { blobPayload, signature } = await commCoreModule.getUserPublicKey();
  const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
    payload: blobPayload,
    signature,
  };
  return signedIdentityKeysBlob;
}

type NativeGetClientResponsesSelectorInputType = {
  ...NavPlusRedux,
  getInitialNotificationsEncryptedMessage: () => Promise<string>,
};

const nativeGetClientResponsesSelector: (
  input: NativeGetClientResponsesSelectorInputType,
) => (
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  (input: NativeGetClientResponsesSelectorInputType) =>
    getClientResponsesSelector(input.redux),
  (input: NativeGetClientResponsesSelectorInputType) =>
    calendarActiveSelector(input.navContext),
  (input: NativeGetClientResponsesSelectorInputType) =>
    input.getInitialNotificationsEncryptedMessage,
  (
      getClientResponsesFunc: (
        calendarActive: boolean,
        oneTimeKeyGenerator: ?OneTimeKeyGenerator,
        getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob>,
        getInitialNotificationsEncryptedMessage: ?() => Promise<string>,
        serverRequests: $ReadOnlyArray<ClientServerRequest>,
      ) => Promise<$ReadOnlyArray<ClientClientResponse>>,
      calendarActive: boolean,
      getInitialNotificationsEncryptedMessage: () => Promise<string>,
    ) =>
    (serverRequests: $ReadOnlyArray<ClientServerRequest>) =>
      getClientResponsesFunc(
        calendarActive,
        oneTimeKeyGenerator,
        getSignedIdentityKeysBlob,
        getInitialNotificationsEncryptedMessage,
        serverRequests,
      ),
);

const baseNativeSessionStateFuncSelector: (
  keyserverID: string,
) => (input: NavPlusRedux) => () => SessionState = keyserverID =>
  createSelector(
    (input: NavPlusRedux) => sessionStateFuncSelector(keyserverID)(input.redux),
    (input: NavPlusRedux) => calendarActiveSelector(input.navContext),
    (
        sessionStateFunc: (calendarActive: boolean) => SessionState,
        calendarActive: boolean,
      ) =>
      () =>
        sessionStateFunc(calendarActive),
  );

const nativeSessionStateFuncSelector: (
  keyserverID: string,
) => (input: NavPlusRedux) => () => SessionState = _memoize(
  baseNativeSessionStateFuncSelector,
);

export {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
};
