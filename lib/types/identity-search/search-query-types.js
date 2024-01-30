// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type SearchQuery = Prefix;

export type Prefix = {
  +type: 'Prefix',
  +prefix: string,
};

export const prefixValidator: TInterface<Prefix> = tShape<Prefix>({
  type: tString('Prefix'),
  prefix: t.String,
});

export const searchQueryValidator: TInterface<Prefix> = prefixValidator;
