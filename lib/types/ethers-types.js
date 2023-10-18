// @flow

export type EthersProvider = {
  +lookupAddress: (address: string) => Promise<?string>,
  +resolveName: (name: string) => Promise<?string>,
  +getAvatar: (name: string) => Promise<?string>,
  ...
};
