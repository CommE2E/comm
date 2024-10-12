// flow-typed signature: 585e2883477434dc7cfd534337e85dce
// flow-typed version: <<STUB>>/viem_v2.9.5/flow_v0.202.1

declare module 'viem' {

  declare export type ViemTransport = { ... };

  declare export function http(url?: string): ViemTransport;

  declare export type ViemChain = { ... };

  declare export type ViemCreateClientParams = {
    +chain: ViemChain,
    +transport: ViemTransport,
    ...
  };

  declare export type ViemClient = {
    ...
  };

  declare export function createClient(
    params: ViemCreateClientParams,
  ): ViemClient;
}

declare module 'view/chains' {
  import type { ViemChain } from 'viem';

  declare export var mainnet: ViemChain;
  declare export var sepolia: ViemChain;
}
