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

export type IdentitySearchMethod = IdentitySearchPrefix;

export type IdentitySearchPrefix = {
  +type: 'IdentitySearchPrefix',
  +prefix: string,
};

export const identityPrefixValidator: TInterface<IdentitySearchPrefix> =
  tShape<IdentitySearchPrefix>({
    type: tString('IdentitySearchPrefix'),
    prefix: t.String,
  });

export const identitySearchMethodValidator: TInterface<IdentitySearchPrefix> =
  identityPrefixValidator;

export type IdentitySearchQuery = {
  +type: 'IdentitySearchQuery',
  +id: string,
  +searchMethod: IdentitySearchMethod,
};

export const identitySearchQueryValidator: TInterface<IdentitySearchQuery> =
  tShape<IdentitySearchQuery>({
    type: tString('IdentitySearchQuery'),
    id: t.String,
    searchMethod: identitySearchMethodValidator,
  });
