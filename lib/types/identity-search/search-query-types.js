// @flow

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
