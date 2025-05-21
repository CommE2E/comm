// @flow

const databaseIdentifier = Object.freeze({
  MAIN: 'main',
  RESTORED: 'restored',
});

export type DatabaseIdentifier = $Values<typeof databaseIdentifier>;

export { databaseIdentifier };
