// @flow

import { getRustAPI } from 'rust-node-addon';

import type { ReservedUsernameMessage } from 'lib/types/crypto-types.js';

import { fetchAllUserDetails } from '../fetchers/user-fetchers.js';
import { signUsingOlmAccount } from '../utils/olm-utils.js';

async function updateIdentityReservedUsernames(): Promise<void> {
  const [userDetails, rustAPI] = await Promise.all([
    fetchAllUserDetails(),
    getRustAPI(),
  ]);
  const issuedAt = new Date().toISOString();
  const reservedUsernameMessage: ReservedUsernameMessage = {
    statement: 'Add the following usernames to reserved list',
    payload: userDetails,
    issuedAt,
  };
  const stringifiedMessage = JSON.stringify(reservedUsernameMessage);
  const signature = await signUsingOlmAccount(stringifiedMessage);

  await rustAPI.addReservedUsernames(stringifiedMessage, signature);
}

export { updateIdentityReservedUsernames };
