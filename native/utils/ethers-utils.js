// @flow

import '@ethersproject/shims';

import { AlchemyProvider } from 'ethers';

import type { EthersProvider } from 'lib/types/ethers-types.js';

let alchemyKey: ?string;
try {
  // $FlowExpectedError: file might not exist
  const { key } = require('../facts/alchemy.json');
  alchemyKey = key;
} catch {}

let ethersProvider: ?EthersProvider;
if (alchemyKey) {
  ethersProvider = new AlchemyProvider('mainnet', alchemyKey);
}

export { alchemyKey, ethersProvider };
