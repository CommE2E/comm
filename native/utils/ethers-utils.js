// @flow

import '@ethersproject/shims';

import { AlchemyProvider } from 'ethers';

import type { EthersProvider } from 'lib/types/ethers-types.js';

let alchemyKey;
try {
  // $FlowExpectedError: file might not exist
  const { key } = require('../facts/alchemy.json');
  alchemyKey = key;
} catch {}

let provider: ?EthersProvider;
if (alchemyKey) {
  provider = new AlchemyProvider('mainnet', alchemyKey);
}

export { provider };
