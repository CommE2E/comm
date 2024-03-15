// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import { cookieSelector } from 'lib/selectors/keyserver-selectors.js';
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

import { calendarActiveSelector } from '../navigation/nav-selectors.js';
import type { AppState } from '../redux/state-types.js';
import type { NavPlusRedux } from '../types/selector-types.js';

const baseSessionIdentificationSelector: (
  keyserverID: string,
) => (state: AppState) => SessionIdentification = keyserverID =>
  createSelector(
    cookieSelector(keyserverID),
    (cookie: ?string): SessionIdentification => ({ cookie }),
  );

const sessionIdentificationSelector: (
  keyserverID: string,
) => (state: AppState) => SessionIdentification = _memoize(
  baseSessionIdentificationSelector,
);

type NativeGetClientResponsesSelectorInputType = $ReadOnly<{
  ...NavPlusRedux,
  +getInitialNotificationsEncryptedMessage: () => Promise<string>,
  +keyserverID: string,
}>;

const nativeGetClientResponsesSelector: (
  input: NativeGetClientResponsesSelectorInputType,
) => (
  serverRequests: $ReadOnlyArray<ClientServerRequest>,
) => Promise<$ReadOnlyArray<ClientClientResponse>> = createSelector(
  (input: NativeGetClientResponsesSelectorInputType) =>
    getClientResponsesSelector(input.redux, input.keyserverID),
  (input: NativeGetClientResponsesSelectorInputType) =>
    calendarActiveSelector(input.navContext),
  (input: NativeGetClientResponsesSelectorInputType) =>
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
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
};
