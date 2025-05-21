// @flow

const databaseIdentifier = Object.freeze({
  MAIN: 'main',
  RESTORED: 'restored',
});

export type DatabaseIdentifier = 'main' | 'restored';

export { databaseIdentifier };
