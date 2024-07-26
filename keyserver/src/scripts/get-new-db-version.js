// @flow

import { main } from './utils.js';
import { newDatabaseVersion } from '../database/migration-config.js';

// Outputs the new database version
async function getNewDatabaseVersion() {
  console.log(newDatabaseVersion);
}

main([getNewDatabaseVersion]);
