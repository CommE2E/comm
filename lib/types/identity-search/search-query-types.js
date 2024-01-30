// @flow

/*
 * This file defines types and validation for the search query message sent
 * from the client to the Identity Search WebSocket server.
 * The definitions in this file should remain in sync
 * with the structures defined in the corresponding
 * Rust file at `shared/identity_search_messages/src/messages/search_query.rs`.
 *
 * If you edit the definitions in one file,
 * please make sure to update the corresponding definitions in the other.
 *
 */

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type SearchMethod = Prefix;

export type Prefix = {
  +type: 'Prefix',
  +prefix: string,
};

export const prefixValidator: TInterface<Prefix> = tShape<Prefix>({
  type: tString('Prefix'),
  prefix: t.String,
});

export const searchMethodValidator: TInterface<Prefix> = prefixValidator;

export type SearchQuery = {
  +type: 'SearchQuery',
  +id: string,
  +searchMethod: SearchMethod,
};

export const searchQueryValidator: TInterface<SearchQuery> =
  tShape<SearchQuery>({
    type: tString('SearchQuery'),
    id: t.String,
    searchMethod: searchMethodValidator,
  });
