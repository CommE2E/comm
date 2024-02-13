// @flow

import { createSelector } from 'reselect';

import type { AuthMessage } from 'lib/types/identity-search/auth-message-types.js';

import type { AppState } from '../redux/redux-setup.js';

export const createIdentitySearchAuthMessage: AppState => ?AuthMessage =
  createSelector(
    (state: AppState) => state.cryptoStore?.primaryIdentityKeys?.ed25519,
    (state: AppState) => state.commServicesAccessToken,
    (state: AppState) => state.currentUserInfo?.id,
    (
      deviceID: ?string,
      accessToken: ?string,
      userID: ?string,
    ): ?AuthMessage => {
      if (!deviceID || !accessToken || !userID) {
        return null;
      }
      return ({
        type: 'AuthMessage',
        deviceID,
        accessToken,
        userID,
      }: AuthMessage);
    },
  );
