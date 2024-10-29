// @flow

import { getRustAPI } from 'rust-node-addon';

import { verifyUserIDs } from '../fetchers/user-fetchers.js';

async function getVerifiedUserIDForFID(fid: string): Promise<?string> {
  const rustAPI = await getRustAPI();
  const farcasterUsers = await rustAPI.getFarcasterUsers([fid]);

  if (farcasterUsers.length !== 1) {
    return null;
  }

  const userIDForFID = farcasterUsers[0].userID;

  const verifiedUserIDs = await verifyUserIDs([userIDForFID]);

  if (verifiedUserIDs.length !== 1) {
    return null;
  }

  return userIDForFID;
}

export { getVerifiedUserIDForFID };
