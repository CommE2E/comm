// @flow

import { ethers } from 'ethers';

import { ENSCache, type EthersProvider } from 'lib/utils/ens-cache';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from 'lib/utils/ens-helpers';

const alchemyKey = process.env.COMM_ALCHEMY_KEY;

let provider: ?EthersProvider;
if (alchemyKey) {
  provider = new ethers.providers.AlchemyProvider('mainnet', alchemyKey);
}

let ensCache: ?ENSCache;
if (provider) {
  ensCache = new ENSCache(provider);
}

let getENSNames: ?GetENSNames;
if (ensCache) {
  getENSNames = baseGetENSNames.bind(null, ensCache);
}

export { provider, ensCache, getENSNames };
