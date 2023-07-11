// @flow

import type { QueryResults } from 'mysql';

import { SQL, dbQuery } from '../database/database.js';

const userIDMetadataKey = 'user_id';
const accessTokenMetadataKey = 'access_token';

// This information is minted when registering with identity service
export type IdentityInfo = { +userId: string, +accessToken: string };

async function fetchIdentityInfo(): Promise<?IdentityInfo> {
  const versionQuery = SQL`
    SELECT data
    FROM metadata
    WHERE name IN (${userIDMetadataKey}, ${accessTokenMetadataKey})
  `;

  const [[userId, accessToken]] = await dbQuery(versionQuery);
  if (!userId || !accessToken) {
    return null;
  }
  return { userId, accessToken };
}

function saveIdentityInfo(userInfo: IdentityInfo): Promise<QueryResults> {
  const updateQuery = SQL`
    REPLACE INTO metadata (name, data)
    VALUES (${userIDMetadataKey}, ${userInfo.userId}),
      (${accessTokenMetadataKey}, ${userInfo.accessToken})
  `;

  return dbQuery(updateQuery);
}

export { fetchIdentityInfo, saveIdentityInfo };
