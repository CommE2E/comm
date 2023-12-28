// @flow

import { getRustAPI } from 'rust-node-addon';

import type { ReservedUsernameMessage } from 'lib/types/crypto-types.js';

import { fetchAllUserDetails } from '../fetchers/user-fetchers.js';
import { fetchOlmAccount } from '../updaters/olm-account-updater.js';

async function updateIdentityReservedUsernames(): Promise<void> {
  const [userDetails, rustAPI, accountInfo] = await Promise.all([
    fetchAllUserDetails(),
    getRustAPI(),
    fetchOlmAccount('content'),
  ]);
  const issuedAt = new Date().toISOString();
  const reservedUsernameMessage: ReservedUsernameMessage = {
    statement: 'Add the following usernames to reserved list',
    payload: userDetails,
    issuedAt,
  };
  const stringifiedMessage = JSON.stringify(reservedUsernameMessage);
  const signature = accountInfo.account.sign(stringifiedMessage);

  await rustAPI.addReservedUsernames(stringifiedMessage, signature);
}

export { updateIdentityReservedUsernames };
