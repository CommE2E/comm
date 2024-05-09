// @flow

/*
 * This file defines types and validation for the search response message
 * sent from the Identity Search WebSocket server to client.
 * The definitions in this file should remain in sync
 * with the structures defined in the corresponding Rust file at
 * `shared/identity_search_messages/src/messages/search_response.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape, tString, tUserID } from '../../utils/validation-utils.js';

export type IdentitySearchFailure = {
  +id: string,
  +error: string,
};

export const identityFailureValidator: TInterface<IdentitySearchFailure> =
  tShape<IdentitySearchFailure>({
    id: t.String,
    error: t.String,
  });

export type IdentitySearchUser = {
  +userID: string,
  +username: string,
};

export const identitySearchUserValidator: TInterface<IdentitySearchUser> =
  tShape<IdentitySearchUser>({
    userID: tUserID,
    username: t.String,
  });

export type IdentitySearchResult = {
  +id: string,
  +hits: $ReadOnlyArray<IdentitySearchUser>,
};

export const identitySearchResultValidator: TInterface<IdentitySearchResult> =
  tShape<IdentitySearchResult>({
    id: t.String,
    hits: t.list(identitySearchUserValidator),
  });

type IdentitySearchResponseSuccess = {
  +type: 'Success',
  +data: IdentitySearchResult,
};
type IdentitySearchResponseError = {
  +type: 'Error',
  +data: IdentitySearchFailure,
};

export type IdentitySearchResponse =
  | IdentitySearchResponseSuccess
  | IdentitySearchResponseError;

export const identitySearchResponseValidator: TUnion<IdentitySearchResponse> =
  t.union([
    tShape<IdentitySearchResponseSuccess>({
      type: tString('Success'),
      data: identitySearchResultValidator,
    }),
    tShape<IdentitySearchResponseError>({
      type: tString('Error'),
      data: identityFailureValidator,
    }),
  ]);
