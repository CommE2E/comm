// @flow

import { http, type ViemTransport } from 'viem';

function getAlchemyMainnetViemTransport(alchemyKey: ?string): ViemTransport {
  const key = alchemyKey ?? 'demo';
  return http(`https://eth-mainnet.g.alchemy.com/v2/${key}`);
}

function getAlchemySepoliaViemTransport(alchemyKey: ?string): ViemTransport {
  const key = alchemyKey ?? 'demo';
  return http(`https://eth-sepolia.g.alchemy.com/v2/${key}`);
}

export { getAlchemyMainnetViemTransport, getAlchemySepoliaViemTransport };
