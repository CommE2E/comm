// @flow

import { getCommConfig } from 'lib/utils/comm-config.js';
import {
  getFCNames as baseGetFCNames,
  type GetFCNames,
  type BaseFCInfo,
} from 'lib/utils/farcaster-helpers.js';
import { FCCache } from 'lib/utils/fc-cache.js';
import { NeynarClient } from 'lib/utils/neynar-client.js';

type NeynarConfig = { +key: string };

let getFCNames: ?GetFCNames;
async function initFCCache() {
  const neynarSecret = await getCommConfig<NeynarConfig>({
    folder: 'secrets',
    name: 'neynar',
  });
  const neynarKey = neynarSecret?.key;
  if (!neynarKey) {
    return;
  }
  const neynarClient = new NeynarClient(neynarKey);
  const fcCache = new FCCache(neynarClient);
  getFCNames = <T: ?BaseFCInfo>(users: $ReadOnlyArray<T>): Promise<T[]> =>
    baseGetFCNames(fcCache, users);
}

export { initFCCache, getFCNames };
