// @flow

import type { QueryResults } from 'mysql';

export type Pool = {
  +on: ('acquire' | 'connection' | 'enqueue' | 'release', () => mixed) => void,
  +pool: {
    +_connectionQueue: $ReadOnlyArray<mixed>,
    ...
  },
  +query: (input: SQLOrString) => Promise<QueryResults>,
  +end: () => void,
  ...
};

export type SQLStatementType = {
  +text: string,
  +query: string,
  +sql: string,
  +name: string,
  +append: (statement: SQLStatementType | string | number) => SQLStatementType,
  +setName: (name: string) => SQLStatementType,
  +useBind: (value?: boolean) => SQLStatementType,
  +values: any[],
};

export type SQLOrString = SQLStatementType | string;

export type Connection = {
  +query: (input: SQLOrString) => Promise<QueryResults>,
  +end: () => void,
};
