// @flow

import type { TInterface, TUnion } from 'tcomb';
import t from 'tcomb';

import { tShape } from '../../utils/validation-utils.js';

export type Prefix = { +prefix: string };

export type SearchQuery = Prefix;

export const prefixValidator: TInterface<Prefix> = tShape<Prefix>({
  prefix: t.String,
});

export const searchQueryValidator: TUnion<Prefix> = t.union([
  tShape<Prefix>({
    prefix: t.String,
  }),
]);
