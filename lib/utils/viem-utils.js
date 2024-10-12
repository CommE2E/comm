// @flow

import { addEnsContracts } from '@ensdomains/ensjs';
import { createClient, http, type ViemTransport, type ViemClient } from 'viem';
// eslint-disable-next-line import/extensions
import { mainnet } from 'viem/chains';

function getAlchemyMainnetViemTransport(alchemyKey: ?string): ViemTransport {
  const key = alchemyKey ?? 'demo';
  return http(`https://eth-mainnet.g.alchemy.com/v2/${key}`);
}

function getAlchemySepoliaViemTransport(alchemyKey: ?string): ViemTransport {
  const key = alchemyKey ?? 'demo';
  return http(`https://eth-sepolia.g.alchemy.com/v2/${key}`);
}

function getAlchemyMainnetViemClientWithENSContracts(
  alchemyKey: ?string,
): ViemClient {
  const viemTransport = getAlchemyMainnetViemTransport(alchemyKey);
  return createClient({
    chain: addEnsContracts(mainnet),
    transport: viemTransport,
  });
}

export {
  getAlchemyMainnetViemTransport,
  getAlchemySepoliaViemTransport,
  getAlchemyMainnetViemClientWithENSContracts,
};
