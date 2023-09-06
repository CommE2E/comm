// @flow

import { createSelector } from 'reselect';

import {
  cookieSelector,
  sessionIDSelector,
  urlPrefixSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
  cookiesSelector,
  urlPrefixesSelector,
  sessionIDsSelector,
  connectionsSelector,
  lastCommunicatedPlatformDetailsObjSelector,
} from './keyserver-selectors.js';
import type { PlatformDetails } from '../types/device-types.js';
import type { AppState } from '../types/redux-types.js';
import type {
  ConnectionInfo,
  ConnectionStatus,
} from '../types/socket-types.js';
import { type CurrentUserInfo } from '../types/user-types.js';

export type ServerCallState = {
  +cookie: ?string,
  +urlPrefix: ?string,
  +sessionID: ?string,
  +currentUserInfo: ?CurrentUserInfo,
  +connectionStatus: ?ConnectionStatus,
  +lastCommunicatedPlatformDetails: ?PlatformDetails,
};

const serverCallStateSelector: (state: AppState) => ServerCallState =
  createSelector(
    cookieSelector,
    urlPrefixSelector,
    sessionIDSelector,
    (state: AppState) => state.currentUserInfo,
    connectionSelector,
    lastCommunicatedPlatformDetailsSelector,
    (
      cookie: ?string,
      urlPrefix: ?string,
      sessionID: ?string,
      currentUserInfo: ?CurrentUserInfo,
      connectionInfo: ?ConnectionInfo,
      lastCommunicatedPlatformDetails: ?PlatformDetails,
    ) => ({
      cookie,
      urlPrefix,
      sessionID,
      currentUserInfo,
      connectionStatus: connectionInfo?.status,
      lastCommunicatedPlatformDetails,
    }),
  );

export type ServersCallState = {
  +cookies: { +[keyserverID: string]: ?string },
  +urlPrefixes: { +[keyserverID: string]: string },
  +sessionIDs: { +[keyserverID: string]: ?string },
  +connectionStatuses: { +[keyserverID: string]: ConnectionStatus },
  +lastCommunicatedPlatformDetails: {
    +[keyserverID: string]: ?PlatformDetails,
  },
  +currentUserInfo: ?CurrentUserInfo,
};

const serversCallStateSelector: (state: AppState) => ServersCallState =
  createSelector(
    cookiesSelector,
    urlPrefixesSelector,
    sessionIDsSelector,
    connectionsSelector,
    lastCommunicatedPlatformDetailsObjSelector,
    (state: AppState) => state.currentUserInfo,
    (
      cookies: { +[keyserverID: string]: ?string },
      urlPrefixes: { +[keyserverID: string]: string },
      sessionIDs: { +[keyserverID: string]: ?string },
      connectionInfos: { +[keyserverID: string]: ConnectionInfo },
      lastCommunicatedPlatformDetails: {
        +[keyserverID: string]: ?PlatformDetails,
      },
      currentUserInfo: ?CurrentUserInfo,
    ) => {
      const connectionStatuses = {};
      for (const key in connectionInfos) {
        connectionStatuses[key] = connectionInfos[key].status;
      }

      return {
        cookies,
        urlPrefixes,
        sessionIDs,
        connectionStatuses,
        lastCommunicatedPlatformDetails,
        currentUserInfo,
      };
    },
  );

export { serverCallStateSelector, serversCallStateSelector };
