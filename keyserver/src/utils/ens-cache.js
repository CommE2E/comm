// @flow

import { ethers } from 'ethers';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { ENSCache } from 'lib/utils/ens-cache.js';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from 'lib/utils/ens-helpers.js';

type AlchemyConfig = { +key: string };
type BaseUserInfo = { +username?: ?string, ... };

let getENSNames: ?GetENSNames;
async function initENSCache() {
  const alchemySecret = await getCommConfig<AlchemyConfig>({
    folder: 'secrets',
    name: 'alchemy',
  });
  const alchemyKey = alchemySecret?.key;
  if (!alchemyKey) {
    return;
  }
  const provider = new ethers.providers.AlchemyProvider('mainnet', alchemyKey);
  const ensCache = new ENSCache(provider);
  getENSNames = <T: ?BaseUserInfo>(users: $ReadOnlyArray<T>): Promise<T[]> =>
    baseGetENSNames(ensCache, users);
}

export { initENSCache, getENSNames };
