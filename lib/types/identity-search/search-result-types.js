// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import { tShape, tString } from '../../utils/validation-utils.js';

export type User = {
  +userID: string,
  +username: string,
};

export type SearchResult = {
  +type: 'SearchResult',
  +hits: $ReadOnlyArray<User>,
};

export const userValidator: TInterface<User> = tShape<User>({
  userID: t.String,
  username: t.String,
});

export const searchResultValidator: TInterface<SearchResult> =
  tShape<SearchResult>({
    type: tString('SearchResult'),
    hits: t.list(userValidator),
  });
