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
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const cookieSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.cookie;

const cookiesSelector: (state: AppState) => {
  +[keyserverID: string]: string,
} = createSelector(
  (state: AppState) => state.keyserverStore.keyserverInfos,
  (infos: { +[key: string]: KeyserverInfo }) => {
    const cookies = {};
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

const baseUrlPrefixSelector: (
  keyserverID: string,
) => (state: AppState) => ?string = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.urlPrefix;

const urlPrefixSelector: (keyserverID: string) => (state: AppState) => ?string =
  _memoize(baseUrlPrefixSelector);

const baseConnectionSelector: (
  keyserverID: string,
) => (state: AppState) => ?ConnectionInfo = keyserverID => (state: AppState) =>
  state.keyserverStore.keyserverInfos[keyserverID]?.connection;

const connectionSelector: (
  keyserverID: string,
) => (state: AppState) => ?ConnectionInfo = _memoize(baseConnectionSelector);

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

      result.push({
        keyserverAdminUsername,
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
    const deviceTokens = {};
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
  connectionSelector,
  lastCommunicatedPlatformDetailsSelector,
  deviceTokensSelector,
  deviceTokenSelector,
  selectedKeyserversSelector,
};
