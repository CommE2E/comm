// @flow

import { ethers } from 'ethers';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { ENSCache } from 'lib/utils/ens-cache.js';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from 'lib/utils/ens-helpers.js';

let getENSNames: ?GetENSNames;
async function initENSCache() {
  const alchemySecret = await getCommConfig({
    folder: 'secrets',
    name: 'alchemy',
  });
  const alchemyKey = alchemySecret?.key;
  if (!alchemyKey) {
    return;
  }
  const provider = new ethers.providers.AlchemyProvider('mainnet', alchemyKey);
  const ensCache = new ENSCache(provider);
  getENSNames = baseGetENSNames.bind(null, ensCache);
}

export { initENSCache, getENSNames };
