// @flow

import {
  getFCNames as baseGetFCNames,
  type GetFCNames,
  type BaseFCNamesInfo,
} from 'lib/utils/farcaster-helpers.js';
import { FCCache } from 'lib/utils/fc-cache.js';
import { NeynarClient } from 'lib/utils/neynar-client.js';

import { getNeynarConfig } from './neynar-utils.js';

let neynarClient: ?NeynarClient;
let fcCache: ?FCCache;
let getFCNames: ?GetFCNames;
async function initFCCache() {
  const neynarSecret = await getNeynarConfig();

  const neynarKey = neynarSecret?.key;
  if (!neynarKey) {
    return;
  }
  neynarClient = new NeynarClient(neynarKey);
  const newFCCache = new FCCache(neynarClient);
  fcCache = newFCCache;
  getFCNames = <T: ?BaseFCNamesInfo>(users: $ReadOnlyArray<T>): Promise<T[]> =>
    baseGetFCNames(newFCCache, users);
}

export { initFCCache, neynarClient, fcCache, getFCNames };
