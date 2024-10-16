// @flow

import invariant from 'invariant';

import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import type { InitialNotifMessageOptions } from '../shared/crypto-utils.js';
import type { RecoveryActionSource } from '../types/account-types.js';
import type { OlmAPI } from '../types/crypto-types.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { EncryptedNotifUtilsAPI } from '../types/notif-types.js';
import type { SQLiteAPI } from '../types/sqlite-types.js';
import type { DispatchActionPromise } from '../utils/redux-promise-utils.js';

export type Config = {
  +resolveKeyserverSessionInvalidationUsingNativeCredentials: ?(
    callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatchActionPromise: DispatchActionPromise,
    recoveryActionSource: RecoveryActionSource,
    keyserverID: string,
    getInitialNotificationsEncryptedMessage: (
      options?: ?InitialNotifMessageOptions,
    ) => Promise<string>,
    hasBeenCancelled: () => boolean,
  ) => Promise<void>,
  +setSessionIDOnRequest: boolean,
  +calendarRangeInactivityLimit: ?number,
  +platformDetails: PlatformDetails,
  +authoritativeKeyserverID: string,
  +olmAPI: OlmAPI,
  +sqliteAPI: SQLiteAPI,
  +encryptedNotifUtilsAPI: EncryptedNotifUtilsAPI,
  +showAlert: (title: string, message: string) => mixed,
};

let registeredConfig: ?Config = null;

const registerConfig = (config: Config) => {
  registeredConfig = { ...registeredConfig, ...config };
};

const getConfig = (): Config => {
  invariant(registeredConfig, 'config should be set');
  return registeredConfig;
};

const hasConfig = (): boolean => {
  return !!registeredConfig;
};

export { registerConfig, getConfig, hasConfig };
