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

import { tShape, tString } from '../../utils/validation-utils.js';

export type Failure = {
  +id: string,
  +error: string,
};

export const failureValidator: TInterface<Failure> = tShape<Failure>({
  id: t.String,
  error: t.String,
});

export type IdentitySearchUser = {
  +userID: string,
  +username: string,
};

export const userValidator: TInterface<IdentitySearchUser> =
  tShape<IdentitySearchUser>({
    userID: t.String,
    username: t.String,
  });

export type SearchResult = {
  +id: string,
  +hits: $ReadOnlyArray<IdentitySearchUser>,
};

export const searchResultValidator: TInterface<SearchResult> =
  tShape<SearchResult>({
    id: t.String,
    hits: t.list(userValidator),
  });

type SearchResponseSuccess = { +type: 'Success', +data: SearchResult };
type SearchResponseError = { +type: 'Error', +data: Failure };

export type SearchResponse = SearchResponseSuccess | SearchResponseError;

export const searchResponseValidator: TUnion<SearchResponse> = t.union([
  tShape<SearchResponseSuccess>({
    type: tString('Success'),
    data: searchResultValidator,
  }),
  tShape<SearchResponseError>({
    type: tString('Error'),
    data: failureValidator,
  }),
]);
