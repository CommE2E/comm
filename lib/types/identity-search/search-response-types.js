// @flow

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

export type User = {
  +userID: string,
  +username: string,
};

export const userValidator: TInterface<User> = tShape<User>({
  userID: t.String,
  username: t.String,
});

export type SearchResult = {
  +id: string,
  +hits: $ReadOnlyArray<User>,
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
