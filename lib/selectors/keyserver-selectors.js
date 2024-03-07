// @flow

import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import type { PlatformDetails } from '../types/device-types';
import type {
  KeyserverInfo,
  KeyserverInfos,
  SelectedKeyserverInfo,
} from '../types/keyserver-types';
import type { AppState } from '../types/redux-types.js';
import type { ConnectionInfo } from '../types/socket-types.js';
import type { UserInfos } from '../types/user-types.js';

const baseCookieSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.cookie;

const cookieSelector: (keyserverID: string) => (state: AppState) => ?string =
  _memoize(baseCookieSelector);

const cookiesSelector: (state: AppState) => {
  +[keyserverID: string]: ?string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const cookies: { [string]: ?string } = {};
    for (const keyserverID in infos) {
      cookies[keyserverID] = infos[keyserverID].cookie;
    }
    return cookies;
  },
);

const baseSessionIDSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.sessionID;

const sessionIDSelector: (keyserverID: string) => (state: AppState) => ?string =
  _memoize(baseSessionIDSelector);

const baseUpdatesCurrentAsOfSelector: (
  keyserverID: string,
) => (state: AppState) => number = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.updatesCurrentAsOf ?? 0;

const updatesCurrentAsOfSelector: (
  keyserverID: string,
) => (state: AppState) => number = _memoize(baseUpdatesCurrentAsOfSelector);

const allUpdatesCurrentAsOfSelector: (state: AppState) => {
  +[keyserverID: string]: number,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const allUpdatesCurrentAsOf: { [string]: number } = {};
    for (const keyserverID in infos) {
      allUpdatesCurrentAsOf[keyserverID] =
        infos[keyserverID].updatesCurrentAsOf;
    }
    return allUpdatesCurrentAsOf;
  },
);

const baseCurrentAsOfSelector: (
  keyserverID: string,
) => (state: AppState) => number = keyserverID => (state: AppState) =>
  state.messageStore.currentAsOf[keyserverID] ?? 0;

const currentAsOfSelector: (
  keyserverID: string,
) => (state: AppState) => number = _memoize(baseCurrentAsOfSelector);

const baseUrlPrefixSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.urlPrefix;

const urlPrefixSelector: (keyserverID: string) => (state: AppState) => ?string =
  _memoize(baseUrlPrefixSelector);

const urlsToIDsSelector: (state: AppState) => {
  +[url: string]: ?string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const urlToIDs: { [string]: ?string } = {};
    for (const keyserverID in infos) {
      urlToIDs[infos[keyserverID].urlPrefix] = keyserverID;
    }
    return urlToIDs;
  },
);

const baseConnectionSelector: (
  keyserverID: string,
) => (state: AppState) => ?ConnectionInfo = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.connection;

const connectionSelector: (
  keyserverID: string,
) => (state: AppState) => ?ConnectionInfo = _memoize(baseConnectionSelector);

const allConnectionInfosSelector: (state: AppState) => {
  +[keyserverID: string]: ?ConnectionInfo,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: KeyserverInfos) => {
    const idToConnectionInfo: { [string]: ?ConnectionInfo } = {};
    for (const keyserverID in infos) {
      idToConnectionInfo[keyserverID] = infos[keyserverID].connection;
    }
    return idToConnectionInfo;
  },
);

const baseLastCommunicatedPlatformDetailsSelector: (
  keyserverID: string,
) => (state: AppState) => ?PlatformDetails = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]
    ?.lastCommunicatedPlatformDetails;

const lastCommunicatedPlatformDetailsSelector: (
  keyserverID: string,
) => (state: AppState) => ?PlatformDetails = _memoize(
  baseLastCommunicatedPlatformDetailsSelector,
);

const selectedKeyserversSelector: (
  state: AppState,
) => $ReadOnlyArray<SelectedKeyserverInfo> = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (state: AppState) => state.userStore.userInfos,
  (keyserverInfos: KeyserverInfos, userInfos: UserInfos) => {
    const result = [];

    for (const key in keyserverInfos) {
      const keyserverInfo = keyserverInfos[key];
      const keyserverAdminUsername = userInfos[key]?.username;

      if (!keyserverAdminUsername) {
        continue;
      }

      const keyserverAdminUserInfo = {
        id: userInfos[key].id,
        username: keyserverAdminUsername,
      };

      result.push({
        keyserverAdminUserInfo,
        keyserverInfo,
      });
    }
    return result;
  },
);

const deviceTokensSelector: (state: AppState) => {
  +[keyserverID: string]: ?string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const deviceTokens: { [string]: ?string } = {};
    for (const keyserverID in infos) {
      deviceTokens[keyserverID] = infos[keyserverID].deviceToken;
    }
    return deviceTokens;
  },
);

const baseDeviceTokenSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.deviceToken;

const deviceTokenSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = _memoize(baseDeviceTokenSelector);

export {
  cookieSelector,
  cookiesSelector,
  sessionIDSelector,
  updatesCurrentAsOfSelector,
  currentAsOfSelector,
  urlPrefixSelector,
  urlsToIDsSelector,
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
  deviceTokensSelector,
  deviceTokenSelector,
  selectedKeyserversSelector,
  allUpdatesCurrentAsOfSelector,
  allConnectionInfosSelector,
};
