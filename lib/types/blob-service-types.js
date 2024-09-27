// @flow

import t, { type TInterface, type TUnion } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

export type BlobInfo = {
  +blobHash: string,
  +holder: string,
};
export const blobInfoValidator: TInterface<BlobInfo> = tShape<BlobInfo>({
  blobHash: t.String,
  holder: t.String,
});

export type HolderAssignmentResult = $ReadOnly<{
  ...BlobInfo,
  // `true` if adding this holder was successful.
  // Also true when `holderAlreadyExists` is true.
  +success: boolean,
  // `true` when given holder already existed
  +holderAlreadyExists: boolean,
  // `true` if blob hash has been uploaded before.
  +dataExists: boolean,
}>;
export const holderAssignmentResultValidator: TInterface<HolderAssignmentResult> =
  tShape<HolderAssignmentResult>({
    blobHash: t.String,
    holder: t.String,
    success: t.Boolean,
    holderAlreadyExists: t.Boolean,
    dataExists: t.Boolean,
  });

export type AssignMultipleHoldersRequest = {
  +requests: $ReadOnlyArray<BlobInfo>,
};
export const assignMultipleHoldersRequestValidator: TInterface<AssignMultipleHoldersRequest> =
  tShape<AssignMultipleHoldersRequest>({
    requests: t.list(blobInfoValidator),
  });

export type AssignMultipleHoldersResponse = {
  +results: $ReadOnlyArray<HolderAssignmentResult>,
};
export const assignMultipleHoldersResponseValidator: TInterface<AssignMultipleHoldersResponse> =
  tShape<AssignMultipleHoldersResponse>({
    results: t.list(holderAssignmentResultValidator),
  });

export type RemoveMultipleHolderItemsRequest = {
  +requests: $ReadOnlyArray<BlobInfo>,
  // Whether to instantly delete blob after last holder is removed, without
  // waiting for cleanup. Defaults to `false` if not provided.
  +instantDelete?: boolean,
};
export const removeMultipleHolderItemsRequestValidator: TInterface<RemoveMultipleHolderItemsRequest> =
  tShape<RemoveMultipleHolderItemsRequest>({
    requests: t.list(blobInfoValidator),
  });

export type RemoveMultipleHoldersByTagRequest = {
  +tags: $ReadOnlyArray<string>,
};
export const removeMultipleHoldersByTagRequestValidator: TInterface<RemoveMultipleHoldersByTagRequest> =
  tShape<RemoveMultipleHoldersByTagRequest>({
    tags: t.list(t.String),
  });

export type RemoveMultipleHoldersRequest =
  | RemoveMultipleHolderItemsRequest
  | RemoveMultipleHoldersByTagRequest;
export const removeMultipleHoldersRequestValidator: TUnion<RemoveMultipleHoldersRequest> =
  t.union([
    removeMultipleHolderItemsRequestValidator,
    removeMultipleHoldersByTagRequestValidator,
  ]);

export type RemoveMultipleHoldersResponse = {
  // Holder removal requests that failed server-side are returned here.
  // This can be passed into retry request body.
  +failedRequests: $ReadOnlyArray<BlobInfo>,
};
export const removeMultipleHoldersResponseValidator: TInterface<RemoveMultipleHoldersResponse> =
  tShape<RemoveMultipleHoldersResponse>({
    failedRequests: t.list(blobInfoValidator),
  });
