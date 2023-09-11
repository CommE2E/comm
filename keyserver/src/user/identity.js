// @flow

import type { QueryResults } from 'mysql';

import { SQL, dbQuery } from '../database/database.js';

const userIDMetadataKey = 'user_id';
const accessTokenMetadataKey = 'access_token';

// This information is minted when registering with identity service
// Naming should reflect the rust-bindings: userId -> user_id
export type IdentityInfo = { +userId: string, +accessToken: string };

async function fetchIdentityInfo(): Promise<?IdentityInfo> {
  const versionQuery = SQL`
    SELECT name, data
    FROM metadata
    WHERE name IN (${userIDMetadataKey}, ${accessTokenMetadataKey})
  `;

  const [result] = await dbQuery(versionQuery);
  let userID, accessToken;
  for (const row of result) {
    if (row.name === userIDMetadataKey) {
      userID = row.data;
    } else if (row.name === accessTokenMetadataKey) {
      accessToken = row.data;
    }
  }

  if (!userID || !accessToken) {
    return null;
  }
  return { userId: userID, accessToken };
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
