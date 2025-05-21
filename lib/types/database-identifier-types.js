// @flow

const databaseIdentifier = Object.freeze({
  // The main database used by the app with all the data.
  MAIN: 'main',
  // Decrypted database downloaded from backup service.
  RESTORED: 'restored',
});

export type DatabaseIdentifier = $Values<typeof databaseIdentifier>;

export { databaseIdentifier };
