// @flow

import type { QueryResults } from 'mysql';

import ashoat from 'lib/facts/ashoat.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type { UserCredentials } from './checks';
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

let cachedKeyserverID: ?string;

async function thisKeyserverID(): Promise<string> {
  if (cachedKeyserverID) {
    return cachedKeyserverID;
  }
  const config = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });
  if (!config?.usingIdentityCredentials) {
    return ashoatKeyserverID;
  }
  const identityInfo = await fetchIdentityInfo();
  cachedKeyserverID = identityInfo?.userId ?? ashoatKeyserverID;
  return cachedKeyserverID;
}

async function isAuthoritativeKeyserver(): Promise<boolean> {
  if (process.env.AUTHORITATIVE_KEYSERVER) {
    return true;
  }

  const id = await thisKeyserverID();
  if (id === ashoat.id) {
    return true;
  }

  return false;
}

export type AdminData = {
  +username: string,
  +id: string,
};

async function thisKeyserverAdmin(): Promise<AdminData> {
  const config = await getCommConfig<UserCredentials>({
    folder: 'secrets',
    name: 'user_credentials',
  });

  if (!config) {
    return {
      id: ashoat.id,
      username: ashoat.username,
    };
  }
  const id = await thisKeyserverID();

  return {
    id,
    username: config.username,
  };
}

function saveIdentityInfo(userInfo: IdentityInfo): Promise<QueryResults> {
  const updateQuery = SQL`
    REPLACE INTO metadata (name, data)
    VALUES (${userIDMetadataKey}, ${userInfo.userId}),
      (${accessTokenMetadataKey}, ${userInfo.accessToken})
  `;

  return dbQuery(updateQuery);
}

export {
  fetchIdentityInfo,
  thisKeyserverID,
  thisKeyserverAdmin,
  saveIdentityInfo,
  isAuthoritativeKeyserver,
};
