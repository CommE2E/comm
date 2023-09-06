// @flow

import { createSelector } from 'reselect';

import type { PlatformDetails } from '../types/device-types';
import type { KeyserverInfo } from '../types/keyserver-types';
import type { AppState } from '../types/redux-types.js';
import type { ConnectionInfo } from '../types/socket-types.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const cookieSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.cookie;

const cookiesSelector: (state: AppState) => {
  +[keyserverID: string]: ?string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const cookies: { [keyserverID: string]: ?string } = {};
    for (const keyserverID in infos) {
      cookies[keyserverID] = infos[keyserverID].cookie;
    }
    return cookies;
  },
);

const sessionIDSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.sessionID;

const updatesCurrentAsOfSelector: (state: AppState) => number = (
  state: AppState,
) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.updatesCurrentAsOf ??
  0;

const currentAsOfSelector: (state: AppState) => number = (state: AppState) =>
  state.messageStore.currentAsOf[ashoatKeyserverID] ?? 0;

const urlPrefixSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.urlPrefix;

const connectionSelector: (state: AppState) => ?ConnectionInfo = (
  state: AppState,
) => state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.connection;

const lastCommunicatedPlatformDetailsSelector: (
  state: AppState,
) => ?PlatformDetails = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]
    ?.lastCommunicatedPlatformDetails;

const urlPrefixesSelector: (state: AppState) => {
  +[keyserverID: string]: string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const result: { [keyserverID: string]: string } = {};
    for (const keyserverID in infos) {
      result[keyserverID] = infos[keyserverID].urlPrefix;
    }
    return result;
  },
);

const sessionIDsSelector: (state: AppState) => {
  +[keyserverID: string]: ?string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const result: { [keyserverID: string]: ?string } = {};
    for (const keyserverID in infos) {
      result[keyserverID] = infos[keyserverID].sessionID;
    }
    return result;
  },
);

const connectionsSelector: (state: AppState) => {
  +[keyserverID: string]: ConnectionInfo,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const result: { [keyserverID: string]: ConnectionInfo } = {};
    for (const keyserverID in infos) {
      result[keyserverID] = infos[keyserverID].connection;
    }
    return result;
  },
);

const lastCommunicatedPlatformDetailsObjSelector: (state: AppState) => {
  +[keyserverID: string]: ?PlatformDetails,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const result: { [keyserverID: string]: ?PlatformDetails } = {};
    for (const keyserverID in infos) {
      result[keyserverID] = infos[keyserverID].lastCommunicatedPlatformDetails;
    }
    return result;
  },
);

export {
  cookieSelector,
  sessionIDSelector,
  updatesCurrentAsOfSelector,
  currentAsOfSelector,
  urlPrefixSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
  cookiesSelector,
  urlPrefixesSelector,
  sessionIDsSelector,
  connectionsSelector,
  lastCommunicatedPlatformDetailsObjSelector,
};
