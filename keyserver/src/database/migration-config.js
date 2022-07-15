// @flow

import fs from 'fs';

import { SQL, dbQuery } from './database';

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
  [
    3,
    async () => {
      await addUUIDColumnToIdsTable();
      await setUUIDsInIdsTable();
      await addTriggerBeforeIdInsert();
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

async function addUUIDColumnToIdsTable(): Promise<void> {
  const show_query = SQL`
    SHOW COLUMNS FROM ids
    LIKE 'uuid_id'
  `;
  const [result] = await dbQuery(show_query);
  if (result !== undefined && result.length > 0) {
    return;
  }
  const alter_query = SQL`
    ALTER TABLE ids
    ADD COLUMN uuid_id CHAR(36)
  `;
  await dbQuery(alter_query);
}

async function setUUIDsInIdsTable(): Promise<void> {
  const update_query = SQL`
    UPDATE ids
    SET uuid_id = UUID()
    WHERE uuid_id IS NULL
  `;
  await dbQuery(update_query);
}

async function addTriggerBeforeIdInsert(): Promise<void> {
  const show_query = SQL`
    SHOW TRIGGERS LIKE 'ids'
  `;
  const [result] = await dbQuery(show_query);
  if (result !== undefined && result.length > 0) {
    return;
  }
  const trigger = SQL`
    CREATE TRIGGER ids_before_insert
    BEFORE INSERT ON ids
    FOR EACH ROW
    SET new.uuid_id = UUID()
  `;
  await dbQuery(trigger);
}

export { migrations, newDatabaseVersion };
