// @flow

type ABIParam = {
  +internalType: string,
  +name: string,
  +type: string,
};
type EthereumSmartContractABI = $ReadOnlyArray<{
  +inputs: $ReadOnlyArray<ABIParam>,
  +stateMutability: string,
  +type: string,
  +name?: ?string,
  +outputs?: ?$ReadOnlyArray<ABIParam>,
}>;

const resolverABI: EthereumSmartContractABI = [
  {
    inputs: [{ internalType: 'contract ENS', name: '_ens', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
    ],
    name: 'getNames',
    outputs: [{ internalType: 'string[]', name: 'r', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function',
  },
];

const mainnetChainID = 1;
const goerliChainID = 5;
const resolverAddresses: { +[chainID: number]: string } = {
  [mainnetChainID]: '0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C',
  [goerliChainID]: '0x333Fc8f550043f239a2CF79aEd5e9cF4A20Eb41e',
};

export type ReverseRecordsEthersSmartContract = {
  +'getNames(address[])': $ReadOnlyArray<string> => Promise<string[]>,
  ...
};

export { resolverABI, resolverAddresses };
