// @flow

import { createSelector } from 'reselect';

import type { ConnectionInitializationMessage } from 'lib/types/tunnelbroker/session-types.js';

import type { AppState } from '../redux/redux-setup.js';

export const createTunnelbrokerInitMessage: AppState => ?ConnectionInitializationMessage =
  createSelector(
    (state: AppState) => state.cryptoStore.primaryIdentityKeys?.ed25519,
    (state: AppState) => state.commServicesAccessToken,
    (state: AppState) => state.currentUserInfo?.id,
    (
      deviceID: ?string,
      accessToken: ?string,
      userID: ?string,
    ): ?ConnectionInitializationMessage => {
      if (!deviceID || !accessToken || !userID) {
        return null;
      }
      return ({
        type: 'ConnectionInitializationMessage',
        deviceID,
        accessToken,
        userID,
        deviceType: 'web',
      }: ConnectionInitializationMessage);
    },
  );
