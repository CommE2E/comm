// flow-typed signature: 3c7fa5a7cb8e52f2d81c14972c6d689f
// flow-typed version: <<STUB>>/@ensdomains/ensjs_v4.0.1/flow_v0.202.1

declare module '@ensdomains/ensjs' {
  import type { ViemChain } from 'viem';

  declare export function addEnsContracts(chain: ViemChain): ViemChain;
}

declare module '@ensdomains/ensjs/public' {
  import type { ViemClient } from 'viem';

  declare export type BatchHandle<T> = {
    ...
  };

  declare export type GetNameResult = {
    +match: boolean,
    +name: ?string,
    +reverseResolverAddress: ?string,
    +resolverAddress: ?string,
    ...
  };
  declare export var getName:
    & {
        +batch: ({ +address: string, ... }) => BatchHandle<GetNameResult>,
        ...
      }
    & (ViemClient, { +address: string, ... }) => Promise<GetNameResult>;

  declare export type GetOwnerResult = {
    +owner: ?string,
    +registrant: ?string,
    +ownershipLevel: ?string,
    ...
  };
  declare export var getOwner:
    & {
        +batch: ({ +name: string, ... }) => BatchHandle<GetOwnerResult>,
        ...
      }
    & (ViemClient, { +name: string, ... }) => Promise<GetOwnerResult>;

  declare export type GetRecordsResult = {
    +texts: $ReadOnlyArray<{
      +key: string,
      +value: string,
    }>,
    ...
  };
  declare export var getRecords:
    & {
        +batch: ({ +name: string, +texts: $ReadOnlyArray<string>, ... }) => BatchHandle<GetRecordsResult>,
        ...
      }
    & (ViemClient, { +name: string, +texts: $ReadOnlyArray<string>, ... }) => Promise<GetRecordsResult>;

  declare export function batch<T>(
    client: ViemClient,
    ...batchCalls: $ReadOnlyArray<BatchHandle<T>>
  ): Promise<Array<T>>;
}
