// @flow

import t, { type TInterface } from 'tcomb';

import { tShape } from '../utils/validation-utils.js';

/*
 * This file defines types and validation for HTTP requests and responses
 * for the Blob Service. The definitions in this file should remain in sync
 * with the structures defined in the `http` submodule of the corresponding
 * Rust file at `shared/comm-lib/src/blob/types.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 */

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

export type AssignHoldersRequest = {
  +requests: $ReadOnlyArray<BlobInfo>,
};

export type AssignHoldersResponse = {
  +results: $ReadOnlyArray<HolderAssignmentResult>,
};
export const assignHoldersResponseValidator: TInterface<AssignHoldersResponse> =
  tShape<AssignHoldersResponse>({
    results: t.list(holderAssignmentResultValidator),
  });

type RemoveHolderItemsRequest = {
  +requests: $ReadOnlyArray<BlobInfo>,
  // Whether to instantly delete blob after last holder is removed, without
  // waiting for cleanup. Defaults to `false` if not provided.
  +instantDelete?: boolean,
};
type RemoveHoldersByTagRequest = {
  +tags: $ReadOnlyArray<string>,
};
export type RemoveHoldersRequest =
  | RemoveHolderItemsRequest
  | RemoveHoldersByTagRequest;

export type RemoveHoldersResponse = {
  // Holder removal requests that failed server-side are returned here.
  // This can be passed into retry request body.
  +failedRequests: $ReadOnlyArray<BlobInfo>,
};
export const removeHoldersResponseValidator: TInterface<RemoveHoldersResponse> =
  tShape<RemoveHoldersResponse>({
    failedRequests: t.list(blobInfoValidator),
  });
