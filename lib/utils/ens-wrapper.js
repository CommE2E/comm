// @flow

import {
  batch,
  getName,
  type GetNameResult,
  getOwner,
  // eslint-disable-next-line import/extensions
} from '@ensdomains/ensjs/public';
import type { ViemClient } from 'viem';

import type { EthersProvider } from '../types/ethers-types.js';

class ENSWrapper {
  viemClient: ViemClient;
  ethersProvider: EthersProvider;

  constructor(viemClient: ViemClient, ethersProvider: EthersProvider) {
    this.viemClient = viemClient;
    this.ethersProvider = ethersProvider;
  }

  getNameForAddress: string => Promise<?string> = async ethAddress => {
    const result = await getName(this.viemClient, { address: ethAddress });
    return result ? result.name : undefined;
  };

  getNamesForAddresses: ($ReadOnlyArray<string>) => Promise<Array<?string>> =
    async ethAddresses => {
      const results = await batch<GetNameResult>(
        this.viemClient,
        ...ethAddresses.map(address => getName.batch({ address })),
      );
      return results.map(result => (result ? result.name : undefined));
    };

  getAddressForName: string => Promise<?string> = async ensName => {
    const result = await getOwner(this.viemClient, { name: ensName });
    return result ? result.owner : undefined;
  };

  // @ensdomains/ensjs doesn't handle resolving ipfs and eip155 URIs to HTTP
  // URIs, so we use the @ensdomains/ens-avatar library instead, which is a
  // little older and uses Ethers.js instead of Viem
  getAvatarURIForName: string => Promise<?string> = async ensName => {
    return await this.ethersProvider.getAvatar(ensName);
  };
}

export { ENSWrapper };
