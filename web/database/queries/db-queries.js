// @flow

function getSQLiteDBVersion(db: SqliteDatabase): number {
  const versionData = db.exec('PRAGMA user_version;');
  if (!versionData.length || !versionData[0].values.length) {
    throw new Error('Error while retrieving database version: empty result');
  }
  const dbVersions: SqlValue = versionData[0].values[0][0];
  if (typeof dbVersions !== 'number') {
    throw new Error(
      'Error while retrieving database version: invalid type returned',
    );
  }
  return dbVersions;
}

export { getSQLiteDBVersion };
