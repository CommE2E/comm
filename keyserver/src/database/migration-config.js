// @flow

import fs from 'fs';

import { dbQuery, SQL } from '../database/database';
import { updateRolesAndPermissionsForAllThreads } from '../updaters/thread-permission-updaters';

const migrations: $ReadOnlyMap<number, () => Promise<void>> = new Map([
  [
    0,
    async () => {
      await makeSureBaseRoutePathExists('facts/commapp_url.json');
      await makeSureBaseRoutePathExists('facts/squadcal_url.json');
    },
  ],
  [
    1,
    async () => {
      try {
        await fs.promises.unlink('facts/url.json');
      } catch {}
    },
  ],
  [
    2,
    async () => {
      await fixBaseRoutePathForLocalhost('facts/commapp_url.json');
      await fixBaseRoutePathForLocalhost('facts/squadcal_url.json');
    },
  ],

  [3, updateRolesAndPermissionsForAllThreads],
  [
    4,
    async () => {
      await dbQuery(SQL`ALTER TABLE uploads ADD INDEX container (container)`);
    },
  ],
  [
    5,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE cookies
          ADD device_id varchar(255) DEFAULT NULL,
          ADD public_key varchar(255) DEFAULT NULL,
          ADD social_proof mediumtext DEFAULT NULL;
      `);
    },
  ],
]);
const newDatabaseVersion: number = Math.max(...migrations.keys());

async function makeSureBaseRoutePathExists(filePath: string): Promise<void> {
  let readFile, json;
  try {
    readFile = await fs.promises.open(filePath, 'r');
    const contents = await readFile.readFile('utf8');
    json = JSON.parse(contents);
  } catch {
    return;
  } finally {
    if (readFile) {
      await readFile.close();
    }
  }
  if (json.baseRoutePath) {
    return;
  }
  let baseRoutePath;
  if (json.baseDomain === 'http://localhost') {
    baseRoutePath = json.basePath;
  } else if (filePath.endsWith('commapp_url.json')) {
    baseRoutePath = '/commweb/';
  } else {
    baseRoutePath = '/';
  }
  const newJSON = { ...json, baseRoutePath };
  console.warn(`updating ${filePath} to ${JSON.stringify(newJSON)}`);
  const writeFile = await fs.promises.open(filePath, 'w');
  await writeFile.writeFile(JSON.stringify(newJSON, null, '  '), 'utf8');
  await writeFile.close();
}

async function fixBaseRoutePathForLocalhost(filePath: string): Promise<void> {
  let readFile, json;
  try {
    readFile = await fs.promises.open(filePath, 'r');
    const contents = await readFile.readFile('utf8');
    json = JSON.parse(contents);
  } catch {
    return;
  } finally {
    if (readFile) {
      await readFile.close();
    }
  }
  if (json.baseDomain !== 'http://localhost') {
    return;
  }
  const baseRoutePath = '/';
  json = { ...json, baseRoutePath };
  console.warn(`updating ${filePath} to ${JSON.stringify(json)}`);
  const writeFile = await fs.promises.open(filePath, 'w');
  await writeFile.writeFile(JSON.stringify(json, null, '  '), 'utf8');
  await writeFile.close();
}

export { migrations, newDatabaseVersion };
