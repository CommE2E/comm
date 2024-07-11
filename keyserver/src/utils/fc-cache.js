// @flow

import { getCommConfig } from 'lib/utils/comm-config.js';
import {
  getFCNames as baseGetFCNames,
  type GetFCNames,
  type BaseFCNamesInfo,
} from 'lib/utils/farcaster-helpers.js';
import { FCCache } from 'lib/utils/fc-cache.js';
import { NeynarClient } from 'lib/utils/neynar-client.js';

type NeynarConfig = {
  +key: string,
  +signerUUID?: string,
  +neynarWebhookSecret?: string,
};

let getFCNames: ?GetFCNames;
let neynarClient: ?NeynarClient;
async function initFCCache() {
  const neynarSecret = await getCommConfig<NeynarConfig>({
    folder: 'secrets',
    name: 'neynar',
  });
  const neynarKey = neynarSecret?.key;
  if (!neynarKey) {
    return;
  }
  neynarClient = new NeynarClient(neynarKey);
  const fcCache = new FCCache(neynarClient);
  getFCNames = <T: ?BaseFCNamesInfo>(users: $ReadOnlyArray<T>): Promise<T[]> =>
    baseGetFCNames(fcCache, users);
}

export { initFCCache, getFCNames, neynarClient };
