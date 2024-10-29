//  @flow

import { getRustAPI } from 'rust-node-addon';

import { verifyUserIDs } from '../fetchers/user-fetchers.js';

async function getVerifiedUserIDForFID(fid: string): Promise<?string> {
  const rustAPI = await getRustAPI();
  const farcasterUsers = await rustAPI.getFarcasterUsers([fid]);

  const validUserIDs = await verifyUserIDs(
    farcasterUsers.map(user => user.userID),
  );

  const validFarcasterUsers = farcasterUsers.filter(user =>
    validUserIDs.includes(user.userID),
  );

  if (validFarcasterUsers.length === 0) {
    return null;
  }

  return validFarcasterUsers[0].userID;
}

export { getVerifiedUserIDForFID };
