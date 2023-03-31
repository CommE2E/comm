// @flow

import fs from 'fs';

import { policyTypes } from 'lib/facts/policies.js';

import { dbQuery, SQL } from '../database/database.js';
import { processMessagesInDBForSearch } from '../database/search-utils.js';
import { updateRolesAndPermissionsForAllThreads } from '../updaters/thread-permission-updaters.js';

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
          ADD social_proof varchar(255) DEFAULT NULL;
      `);
    },
  ],
  [
    7,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE users
            DROP COLUMN IF EXISTS public_key,
            MODIFY hash char(60) COLLATE utf8mb4_bin DEFAULT NULL;
    
          ALTER TABLE sessions 
            DROP COLUMN IF EXISTS public_key;
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    8,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE users
            ADD COLUMN IF NOT EXISTS ethereum_address char(42) DEFAULT NULL;
        `,
      );
    },
  ],
  [
    9,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS target_message bigint(20) DEFAULT NULL;

          ALTER TABLE messages
            ADD INDEX target_message (target_message);
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    10,
    async () => {
      await dbQuery(SQL`
        CREATE TABLE IF NOT EXISTS policy_acknowledgments (
          user bigint(20) NOT NULL,
          policy varchar(255) NOT NULL,
          date bigint(20) NOT NULL,
          confirmed tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (user, policy)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);
    },
  ],
  [
    11,
    async () => {
      const time = Date.now();
      await dbQuery(SQL`
        INSERT IGNORE INTO policy_acknowledgments (policy, user, date, 
          confirmed)
        SELECT ${policyTypes.tosAndPrivacyPolicy}, id, ${time}, 1
        FROM users
      `);
    },
  ],
  [
    12,
    async () => {
      await dbQuery(SQL`
        CREATE TABLE IF NOT EXISTS siwe_nonces (
          nonce char(17) NOT NULL,
          creation_time bigint(20) NOT NULL,
          PRIMARY KEY (nonce)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);
    },
  ],
  [
    13,
    async () => {
      await Promise.all([
        writeSquadCalRoute('facts/squadcal_url.json'),
        moveToNonApacheConfig('facts/commapp_url.json', '/comm/'),
        moveToNonApacheConfig('facts/landing_url.json', '/commlanding/'),
      ]);
    },
  ],
  [
    14,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE cookies MODIFY COLUMN social_proof mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;
      `);
    },
  ],
  [
    15,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE uploads 
            ADD COLUMN IF NOT EXISTS thread bigint(20) DEFAULT NULL,
            ADD INDEX IF NOT EXISTS thread (thread);
          
          UPDATE uploads 
            SET thread = (
              SELECT thread FROM messages 
              WHERE messages.id = uploads.container
            );
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    16,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE cookies
            DROP COLUMN IF EXISTS public_key;

          ALTER TABLE cookies 
            ADD COLUMN IF NOT EXISTS signed_identity_keys mediumtext 
              CHARACTER SET utf8mb4 
              COLLATE utf8mb4_bin 
              DEFAULT NULL;
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    17,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE cookies 
            DROP INDEX device_token,
            DROP INDEX user_device_token;

          ALTER TABLE cookies
            MODIFY device_token mediumtext 
              CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
            ADD UNIQUE KEY device_token (device_token(512)),
            ADD KEY user_device_token (user,device_token(512));
        `,
        { multipleStatements: true },
      );
    },
  ],
  [18, updateRolesAndPermissionsForAllThreads],
  [19, updateRolesAndPermissionsForAllThreads],
  [
    20,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE threads
          ADD COLUMN IF NOT EXISTS avatar varchar(191)
            COLLATE utf8mb4_bin
            DEFAULT NULL;
      `);
    },
  ],
  [
    21,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE reports
          DROP INDEX IF EXISTS user,
          ADD INDEX IF NOT EXISTS user_type_platform_creation_time
            (user, type, platform, creation_time);
      `);
    },
  ],
  [
    22,
    async () => {
      await dbQuery(
        SQL`
          ALTER TABLE cookies
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE entries
            MODIFY creator varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE focused
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE memberships
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE messages
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE notifications
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE reports
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE revisions
            MODIFY author varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE sessions
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE threads
            MODIFY creator varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE updates
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE uploads
            MODIFY uploader varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE users
            MODIFY id varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE relationships_undirected
            MODIFY user1 varchar(255) CHARSET latin1 COLLATE latin1_bin,
            MODIFY user2 varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE relationships_directed
            MODIFY user1 varchar(255) CHARSET latin1 COLLATE latin1_bin,
            MODIFY user2 varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE user_messages
            MODIFY recipient varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE settings
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
          ALTER TABLE policy_acknowledgments
            MODIFY user varchar(255) CHARSET latin1 COLLATE latin1_bin;
        `,
        { multipleStatements: true },
      );
    },
  ],
  [23, updateRolesAndPermissionsForAllThreads],
  [
    24,
    async () => {
      await dbQuery(
        SQL`
        CREATE TABLE IF NOT EXISTS message_search (
          original_message_id bigint(20) NOT NULL,
          message_id bigint(20) NOT NULL,
          processed_content mediumtext COLLATE utf8mb4_bin
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

        ALTER TABLE message_search
          ADD PRIMARY KEY (original_message_id),
          ADD FULLTEXT INDEX processed_content (processed_content);
      `,
        { multipleStatements: true },
      );
    },
  ],
  [25, processMessagesInDBForSearch],
]);
const newDatabaseVersion: number = Math.max(...migrations.keys());

async function writeJSONToFile(data: any, filePath: string): Promise<void> {
  console.warn(`updating ${filePath} to ${JSON.stringify(data)}`);
  const fileHandle = await fs.promises.open(filePath, 'w');
  await fileHandle.writeFile(JSON.stringify(data, null, '  '), 'utf8');
  await fileHandle.close();
}

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
  await writeJSONToFile(newJSON, filePath);
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
  await writeJSONToFile(json, filePath);
}

async function moveToNonApacheConfig(
  filePath: string,
  routePath: string,
): Promise<void> {
  if (process.env.COMM_DATABASE_HOST) {
    return;
  }
  // Since the non-Apache config is so opinionated, just write expected config
  const newJSON = {
    baseDomain: 'http://localhost:3000',
    basePath: routePath,
    baseRoutePath: routePath,
    https: false,
    proxy: 'none',
  };

  await writeJSONToFile(newJSON, filePath);
}

async function writeSquadCalRoute(filePath: string): Promise<void> {
  if (process.env.COMM_DATABASE_HOST) {
    return;
  }
  // Since the non-Apache config is so opinionated, just write expected config
  const newJSON = {
    baseDomain: 'http://localhost:3000',
    basePath: '/comm/',
    baseRoutePath: '/',
    https: false,
    proxy: 'apache',
  };

  await writeJSONToFile(newJSON, filePath);
}

export { migrations, newDatabaseVersion };
