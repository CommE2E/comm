// @flow

import fs from 'fs';

import bots from 'lib/facts/bots.js';
import { policyTypes } from 'lib/facts/policies.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';

import { dbQuery, SQL } from '../database/database.js';
import { processMessagesInDBForSearch } from '../database/search-utils.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateRolesAndPermissionsForAllThreads } from '../updaters/thread-permission-updaters.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { ensureUserCredentials } from '../user/checks.js';
import { createPickledOlmAccount } from '../utils/olm-utils.js';

const botViewer = createScriptViewer(bots.commbot.userID);

const migrations: $ReadOnlyMap<number, () => Promise<mixed>> = new Map([
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
  [24, updateRolesAndPermissionsForAllThreads],
  [
    25,
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
  [26, processMessagesInDBForSearch],
  [
    27,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE messages
          ADD COLUMN IF NOT EXISTS pinned tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS pin_time bigint(20) DEFAULT NULL,
          ADD INDEX IF NOT EXISTS thread_pinned (thread, pinned);
      `);
    },
  ],
  [
    28,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE threads
          ADD COLUMN IF NOT EXISTS pinned_count int UNSIGNED NOT NULL DEFAULT 0;
      `);
    },
  ],
  [29, updateRolesAndPermissionsForAllThreads],
  [
    30,
    async () => {
      await dbQuery(SQL`DROP TABLE versions;`);
    },
  ],
  [
    31,
    async () => {
      await dbQuery(
        SQL`
          CREATE TABLE IF NOT EXISTS invite_links (
            id bigint(20) NOT NULL,
            name varchar(255) CHARSET latin1 NOT NULL,
            \`primary\` tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
            role bigint(20) NOT NULL,
            community bigint(20) NOT NULL,
            expiration_time bigint(20),
            limit_of_uses int UNSIGNED,
            number_of_uses int UNSIGNED NOT NULL DEFAULT 0
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
          ALTER TABLE invite_links
            ADD PRIMARY KEY (id),
            ADD UNIQUE KEY (name),
            ADD INDEX community_primary (community, \`primary\`);
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    32,
    async () => {
      await dbQuery(SQL`
        UPDATE messages
        SET target_message = JSON_VALUE(content, "$.sourceMessageID")
        WHERE type = ${messageTypes.SIDEBAR_SOURCE};
      `);
    },
  ],
  [
    33,
    async () => {
      await dbQuery(
        SQL`
          CREATE TABLE IF NOT EXISTS olm_sessions (
            cookie_id bigint(20) NOT NULL,
            is_content tinyint(1) NOT NULL,
            version bigint(20) NOT NULL,
            pickled_olm_session text 
              CHARACTER SET latin1 
              COLLATE latin1_bin NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_bin;

          ALTER TABLE olm_sessions
            ADD PRIMARY KEY (cookie_id, is_content);
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    34,
    async () => {
      await dbQuery(
        SQL`
          CREATE TABLE IF NOT EXISTS olm_accounts (
            is_content tinyint(1) NOT NULL,
            version bigint(20) NOT NULL,
            pickling_key text 
              CHARACTER SET latin1 
              COLLATE latin1_bin NOT NULL,
            pickled_olm_account text 
              CHARACTER SET latin1 
              COLLATE latin1_bin NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_bin;

          ALTER TABLE olm_accounts
            ADD PRIMARY KEY (is_content);
        `,
        { multipleStatements: true },
      );
    },
  ],
  [
    35,
    async () => {
      await createOlmAccounts();
    },
  ],
  [36, updateRolesAndPermissionsForAllThreads],
  [
    37,
    async () => {
      await dbQuery(
        SQL`
          DELETE FROM olm_accounts;
          DELETE FROM olm_sessions;
        `,
        { multipleStatements: true },
      );
      await createOlmAccounts();
    },
  ],
  [
    38,
    async () => {
      const [result] = await dbQuery(SQL`
        SELECT t.id
        FROM threads t
        INNER JOIN memberships m ON m.thread = t.id AND m.role > 0
        INNER JOIN users u ON u.id = m.user
        WHERE t.type = ${threadTypes.PRIVATE}
          AND t.name = u.ethereum_address
      `);
      const threadIDs = result.map(({ id }) => id.toString());
      while (threadIDs.length > 0) {
        // Batch 10 updateThread calls at a time
        const batch = threadIDs.splice(0, 10);
        await Promise.all(
          batch.map(threadID =>
            updateThread(
              botViewer,
              {
                threadID,
                changes: {
                  name: '',
                },
              },
              {
                silenceMessages: true,
                ignorePermissions: true,
              },
            ),
          ),
        );
      }
    },
  ],
  [39, ensureUserCredentials],
  [
    40,
    // Tokens from identity service are 512 characters long
    () =>
      dbQuery(
        SQL`
          ALTER TABLE metadata
          MODIFY COLUMN data VARCHAR(1023)
        `,
      ),
  ],
  [
    41,
    () =>
      dbQuery(
        SQL`
          ALTER TABLE memberships
            DROP INDEX user,
            ADD KEY user_role_thread (user, role, thread)
        `,
      ),
  ],
  [
    42,
    async () => {
      await dbQuery(SQL`
        ALTER TABLE roles
        ADD UNIQUE KEY thread_name (thread, name);
      `);
    },
  ],
  [
    43,
    () =>
      dbQuery(
        SQL`
          UPDATE threads
          SET pinned_count = (
            SELECT COUNT(*) 
            FROM messages 
            WHERE messages.thread = threads.id 
              AND messages.pinned = 1
          )
        `,
      ),
  ],
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

async function createOlmAccounts() {
  const [pickledContentAccount, pickledNotificationsAccount] =
    await Promise.all([createPickledOlmAccount(), createPickledOlmAccount()]);

  await dbQuery(
    SQL`
      INSERT INTO olm_accounts (is_content, version, 
        pickling_key, pickled_olm_account)
      VALUES
      (
        TRUE, 
        0, 
        ${pickledContentAccount.picklingKey}, 
        ${pickledContentAccount.pickledAccount}
      ),
      (
        FALSE, 
        0, 
        ${pickledNotificationsAccount.picklingKey}, 
        ${pickledNotificationsAccount.pickledAccount}
      );
    `,
  );
}

export { migrations, newDatabaseVersion, createOlmAccounts };
