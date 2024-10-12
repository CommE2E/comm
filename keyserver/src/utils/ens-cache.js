// @flow

import { AlchemyProvider } from 'ethers';

import { getCommConfig } from 'lib/utils/comm-config.js';
import { ENSCache } from 'lib/utils/ens-cache.js';
import {
  getENSNames as baseGetENSNames,
  type GetENSNames,
} from 'lib/utils/ens-helpers.js';
import { ENSWrapper } from 'lib/utils/ens-wrapper.js';
import { getAlchemyMainnetViemClientWithENSContracts } from 'lib/utils/viem-utils.js';

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
  const viemClient = getAlchemyMainnetViemClientWithENSContracts(alchemyKey);
  const ethersProvider = new AlchemyProvider('mainnet', alchemyKey);
  const ensWrapper = new ENSWrapper(viemClient, ethersProvider);
  const ensCache = new ENSCache(ensWrapper);
  getENSNames = <T: ?BaseUserInfo>(users: $ReadOnlyArray<T>): Promise<T[]> =>
    baseGetENSNames(ensCache, users);
}

export { initENSCache, getENSNames };
