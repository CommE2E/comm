// @flow

import type { QueryResults } from 'mysql';

import ashoat from 'lib/facts/ashoat.js';
import { getCommConfig } from 'lib/utils/comm-config.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type { UserCredentials } from './checks';
import { SQL, dbQuery } from '../database/database.js';

const MetadataKeys = Object.freeze({
  USER_ID: 'user_id',
  ACCESS_TOKEN: 'access_token',
});

type MetadataKey = $Values<typeof MetadataKeys>;

// This information is minted when registering with identity service
// Naming should reflect the rust-bindings: userId -> user_id
export type IdentityInfo = { +userId: string, +accessToken: string };

// This function should only be used to fetch string values from the metadata
// table
async function fetchMetadata(
  keys: $ReadOnlyArray<MetadataKey>,
): Promise<Map<MetadataKey, string>> {
  const metadataQuery = SQL`
    SELECT name, data
    FROM metadata
    WHERE name IN (${keys})
  `;

  const [result] = await dbQuery(metadataQuery);

  const metadataMap = new Map<MetadataKey, string>();

  for (const row of result) {
    metadataMap.set(row.name, row.data);
  }

  return metadataMap;
}

async function fetchIdentityInfo(): Promise<?IdentityInfo> {
  const keys = [MetadataKeys.USER_ID, MetadataKeys.ACCESS_TOKEN];

  const metadataMap = await fetchMetadata(keys);

  const userID = metadataMap.get(MetadataKeys.USER_ID);
  const accessToken = metadataMap.get(MetadataKeys.ACCESS_TOKEN);

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

function saveMetadata(
  metadataMap: Map<MetadataKey, string>,
): Promise<QueryResults> {
  const updateQuery = SQL`REPLACE INTO metadata (name, data)`;
  const entries = [...metadataMap.entries()];
  updateQuery.append(SQL` VALUES ${entries}`);

  return dbQuery(updateQuery);
}

function saveIdentityInfo(userInfo: IdentityInfo): Promise<QueryResults> {
  const metadataMap = new Map<MetadataKey, string>();
  metadataMap.set(MetadataKeys.USER_ID, userInfo.userId);
  metadataMap.set(MetadataKeys.ACCESS_TOKEN, userInfo.accessToken);

  return saveMetadata(metadataMap);
}

export {
  fetchIdentityInfo,
  thisKeyserverID,
  thisKeyserverAdmin,
  saveIdentityInfo,
};
