// @flow

import { createSelector } from 'reselect';

import type { KeyserverInfo } from '../types/keyserver-types';
import type { AppState } from '../types/redux-types.js';
import { ashoatKeyserverID } from '../utils/validation-utils.js';

const cookieSelector: (state: AppState) => ?string = (state: AppState) =>
  state.keyserverStore.keyserverInfos[ashoatKeyserverID]?.cookie ??
  state.cookie;

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

export { cookieSelector, cookiesSelector };
