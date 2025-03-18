// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import fs from 'fs';

import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import { policyTypes } from 'lib/facts/policies.js';
import { specialRoles } from 'lib/permissions/special-roles.js';
import { inviteLinkBlobHash } from 'lib/shared/invite-links.js';
import type { InviteLinkWithHolder } from 'lib/types/link-types.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  threadPermissions,
  userSurfacedPermissions,
  type ThreadRolePermissionsBlob,
  type UserSurfacedPermission,
} from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import { permissionsToRemoveInMigration } from 'lib/utils/migration-utils.js';
import {
  userSurfacedPermissionsFromRolePermissions,
  toggleUserSurfacedPermission,
} from 'lib/utils/role-utils.js';

import { processMessagesInDBForSearch } from './search-utils.js';
import { dbQuery, SQL } from '../database/database.js';
import { deleteThread } from '../deleters/thread-deleters.js';
import { fetchAllPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchPickledOlmAccount } from '../fetchers/olm-account-fetchers.js';
import { deleteBlob } from '../services/blob.js';
import { createScriptViewer } from '../session/scripts.js';
import { updateChangedUndirectedRelationships } from '../updaters/relationship-updaters.js';
import { updateRolesAndPermissionsForAllThreads } from '../updaters/thread-permission-updaters.js';
import { updateThread } from '../updaters/thread-updaters.js';
import { ensureUserCredentials } from '../user/checks.js';
import type { PickledOlmAccount } from '../utils/olm-objects.js';
import {
  createPickledOlmAccount,
  unpickleAccountAndUseCallback,
} from '../utils/olm-objects.js';
import { publishPrekeysToIdentity } from '../utils/olm-utils.js';
import RelationshipChangeset from '../utils/relationship-changeset.js';
import { synchronizeInviteLinksWithBlobs } from '../utils/synchronize-invite-links-with-blobs.js';

const botViewer = createScriptViewer(bots.commbot.userID);

// wrap_in_transaction_and_block_requests doesn't work right now
// Tracked in ENG-9228
export type MigrationType =
  | 'wrap_in_transaction_and_block_requests'
  | 'run_simultaneously_with_requests';
export type Migration = {
  +version: number,
  +migrationPromise: () => Promise<mixed>,
  +migrationType?: MigrationType,
};

const migrations: $ReadOnlyArray<Migration> = [
  {
    version: 0,
    migrationPromise: async () => {
      await makeSureBaseRoutePathExists('facts/commapp_url.json');
      await makeSureBaseRoutePathExists('facts/squadcal_url.json');
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 1,
    migrationPromise: async () => {
      try {
        await fs.promises.unlink('facts/url.json');
      } catch {}
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 2,
    migrationPromise: async () => {
      await fixBaseRoutePathForLocalhost('facts/commapp_url.json');
      await fixBaseRoutePathForLocalhost('facts/squadcal_url.json');
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },

  {
    version: 3,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 4,
    migrationPromise: async () => {
      await dbQuery(SQL`ALTER TABLE uploads ADD INDEX container (container)`);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 5,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE cookies
          ADD device_id varchar(255) DEFAULT NULL,
          ADD public_key varchar(255) DEFAULT NULL,
          ADD social_proof varchar(255) DEFAULT NULL;
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 7,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 8,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE users
            ADD COLUMN IF NOT EXISTS ethereum_address char(42) DEFAULT NULL;
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 9,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 10,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 11,
    migrationPromise: async () => {
      const time = Date.now();
      await dbQuery(SQL`
        INSERT IGNORE INTO policy_acknowledgments (policy, user, date, 
          confirmed)
        SELECT ${policyTypes.tosAndPrivacyPolicy}, id, ${time}, 1
        FROM users
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 12,
    migrationPromise: async () => {
      await dbQuery(SQL`
        CREATE TABLE IF NOT EXISTS siwe_nonces (
          nonce char(17) NOT NULL,
          creation_time bigint(20) NOT NULL,
          PRIMARY KEY (nonce)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 13,
    migrationPromise: async () => {
      await Promise.all([
        writeSquadCalRoute('facts/squadcal_url.json'),
        moveToNonApacheConfig('facts/commapp_url.json', '/comm/'),
        moveToNonApacheConfig('facts/landing_url.json', '/commlanding/'),
      ]);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 14,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE cookies MODIFY COLUMN social_proof mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL;
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 15,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 16,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 17,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 18,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 19,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 20,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE threads
          ADD COLUMN IF NOT EXISTS avatar varchar(191)
            COLLATE utf8mb4_bin
            DEFAULT NULL;
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 21,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE reports
          DROP INDEX IF EXISTS user,
          ADD INDEX IF NOT EXISTS user_type_platform_creation_time
            (user, type, platform, creation_time);
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 22,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 23,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 24,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 25,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 26,
    migrationPromise: processMessagesInDBForSearch,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 27,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE messages
          ADD COLUMN IF NOT EXISTS pinned tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS pin_time bigint(20) DEFAULT NULL,
          ADD INDEX IF NOT EXISTS thread_pinned (thread, pinned);
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 28,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE threads
          ADD COLUMN IF NOT EXISTS pinned_count int UNSIGNED NOT NULL DEFAULT 0;
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 29,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 30,
    migrationPromise: async () => {
      await dbQuery(SQL`DROP TABLE versions;`);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 31,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 32,
    migrationPromise: async () => {
      await dbQuery(SQL`
        UPDATE messages
        SET target_message = JSON_VALUE(content, "$.sourceMessageID")
        WHERE type = ${messageTypes.SIDEBAR_SOURCE};
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 33,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 34,
    migrationPromise: async () => {
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 35,
    migrationPromise: async () => {
      await createOlmAccounts();
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 36,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 37,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          DELETE FROM olm_accounts;
          DELETE FROM olm_sessions;
        `,
        { multipleStatements: true },
      );
      await createOlmAccounts();
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 38,
    migrationPromise: async () => {
      const [result] = await dbQuery(SQL`
        SELECT t.id
        FROM threads t
        INNER JOIN memberships m ON m.thread = t.id AND m.role > 0
        INNER JOIN users u ON u.id = m.user
        WHERE t.type = ${threadTypes.GENESIS_PRIVATE}
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 39,
    migrationPromise: ensureUserCredentials,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 40,
    // Tokens from identity service are 512 characters long
    migrationPromise: () =>
      dbQuery(
        SQL`
          ALTER TABLE metadata
          MODIFY COLUMN data VARCHAR(1023)
        `,
      ),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 41,
    migrationPromise: () =>
      dbQuery(
        SQL`
          ALTER TABLE memberships
            DROP INDEX user,
            ADD KEY user_role_thread (user, role, thread)
        `,
      ),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 42,
    migrationPromise: async () => {
      await dbQuery(SQL`
        ALTER TABLE roles
        ADD UNIQUE KEY thread_name (thread, name);
      `);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 43,
    migrationPromise: () =>
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
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 44,
    migrationPromise: async () => {
      const { SIDEBAR_SOURCE, TOGGLE_PIN } = messageTypes;
      const [result] = await dbQuery(SQL`
        SELECT m1.thread
        FROM messages m1
        LEFT JOIN messages m2
          ON m2.id = m1.target_message
        WHERE m1.type = ${SIDEBAR_SOURCE} AND m2.type = ${TOGGLE_PIN}
      `);

      const threadIDs = new Set<string>();
      for (const row of result) {
        threadIDs.add(row.thread.toString());
      }

      await Promise.all(
        [...threadIDs].map(threadID =>
          deleteThread(botViewer, { threadID }, { ignorePermissions: true }),
        ),
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 45,
    migrationPromise: () =>
      dbQuery(
        SQL`
          ALTER TABLE uploads
            CHARSET utf8mb4 COLLATE utf8mb4_bin,
            MODIFY COLUMN type varchar(255)
              CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL,
            MODIFY COLUMN filename varchar(255)
              CHARSET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
            MODIFY COLUMN mime varchar(255)
              CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL,
            MODIFY COLUMN secret varchar(255)
              CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL;
        `,
      ),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 46,
    migrationPromise: async () => {
      try {
        const [content, notif] = await Promise.all([
          fetchPickledOlmAccount('content'),
          fetchPickledOlmAccount('notifications'),
        ]);
        await unpickleAccountAndUseCallback(
          content,
          (contentAccount: OlmAccount) =>
            unpickleAccountAndUseCallback(notif, (notifAccount: OlmAccount) =>
              publishPrekeysToIdentity(contentAccount, notifAccount),
            ),
        );
      } catch (e) {
        console.warn('Encountered error while trying to publish prekeys', e);
        if (process.env.NODE_ENV !== 'development') {
          throw e;
        }
      }
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 47,
    migrationPromise: () =>
      dbQuery(SQL`ALTER TABLE cookies MODIFY COLUMN hash char(64) NOT NULL`),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 48,
    migrationPromise: async () => {
      const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
      const query = SQL`
        UPDATE memberships mm
        LEFT JOIN (
          SELECT m.thread, MAX(m.id) AS message FROM messages m
          WHERE m.type != ${messageTypes.CREATE_SUB_THREAD} 
            AND m.thread = ${genesis().id}
          GROUP BY m.thread 
        ) all_users_query ON mm.thread = all_users_query.thread
        LEFT JOIN (
          SELECT m.thread, stm.user, MAX(m.id) AS message FROM messages m
          LEFT JOIN memberships stm ON m.type = ${
            messageTypes.CREATE_SUB_THREAD
          }
            AND stm.thread = m.content
          WHERE JSON_EXTRACT(stm.permissions, ${visibleExtractString}) IS TRUE
            AND m.thread = ${genesis().id}
          GROUP BY m.thread, stm.user
        ) last_subthread_message_for_user_query 
        ON mm.thread = last_subthread_message_for_user_query.thread 
          AND mm.user = last_subthread_message_for_user_query.user
        SET
          mm.last_message = GREATEST(COALESCE(all_users_query.message, 0), 
            COALESCE(last_subthread_message_for_user_query.message, 0))
        WHERE mm.thread = ${genesis().id};
      `;
      await dbQuery(query);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 49,
    migrationPromise: async () => {
      if (isDockerEnvironment()) {
        return;
      }
      const defaultCorsConfig = {
        domain: 'http://localhost:3000',
      };
      await writeJSONToFile(defaultCorsConfig, 'facts/webapp_cors.json');
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 50,
    migrationPromise: async () => {
      await moveToNonApacheConfig('facts/webapp_url.json', '/webapp/');
      await moveToNonApacheConfig('facts/keyserver_url.json', '/keyserver/');
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 51,
    migrationPromise: async () => {
      if (permissionsToRemoveInMigration.length === 0) {
        return;
      }

      const setClause = SQL`permissions = 
        JSON_REMOVE(permissions, ${permissionsToRemoveInMigration.map(
          path => `$.${path}`,
        )})`;

      const updateQuery = SQL`
        UPDATE roles r
        LEFT JOIN threads t ON t.id = r.thread
      `;

      updateQuery.append(SQL`SET `.append(setClause));

      updateQuery.append(SQL`
        WHERE r.name != 'Admins'
          AND (t.type = ${threadTypes.COMMUNITY_ROOT}
            OR t.type = ${threadTypes.COMMUNITY_ANNOUNCEMENT_ROOT})
      `);

      await dbQuery(updateQuery);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 52,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE roles
          ADD COLUMN IF NOT EXISTS
            special_role tinyint(2) UNSIGNED DEFAULT NULL
        `,
      );

      await updateRolesAndPermissionsForAllThreads();
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 53,
    migrationPromise: async () =>
      dbQuery(SQL`
        ALTER TABLE invite_links 
          ADD COLUMN blob_holder char(36) CHARSET latin1
      `),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 54,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE roles
            ADD COLUMN IF NOT EXISTS special_role 
              tinyint(2) UNSIGNED DEFAULT NULL,
            DROP KEY IF EXISTS thread,
            ADD KEY IF NOT EXISTS thread_special_role (thread, special_role);

          UPDATE roles r
          JOIN threads t ON r.id = t.default_role
          SET r.special_role = ${specialRoles.DEFAULT_ROLE};
        `,
        { multipleStatements: true },
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 55,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE threads
          DROP COLUMN IF EXISTS default_role
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 56,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          UPDATE roles
          SET special_role = ${specialRoles.ADMIN_ROLE}
          WHERE name = 'Admins'
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 57,
    migrationPromise: synchronizeInviteLinksWithBlobs,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 58,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE updates
            MODIFY \`key\` varchar(255) CHARSET latin1 COLLATE latin1_bin
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 59,
    migrationPromise: () => dbQuery(SQL`DROP TABLE one_time_keys`),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 60,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          DELETE
          FROM messages
          WHERE type = 22
            AND JSON_EXTRACT(content, '$.operation') = 'farcaster_mutual'
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 61,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE uploads
            MODIFY container varchar(255) CHARSET latin1 COLLATE latin1_bin
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 62,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE uploads
            MODIFY container bigint(20)
        `,
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 63,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          ALTER TABLE uploads
            ADD COLUMN user_container varchar(255)
              CHARSET latin1
              COLLATE latin1_bin
              DEFAULT NULL
              AFTER container,
            ADD INDEX user_container (user_container);
          UPDATE IGNORE uploads u
            INNER JOIN users us ON us.id = u.container
            SET u.container = NULL, u.user_container = us.id;
        `,
        { multipleStatements: true },
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 64,
    migrationPromise: async () => {
      await dbQuery(
        SQL`
          CREATE TABLE IF NOT EXISTS communities (
            id bigint(20) NOT NULL,
            farcaster_channel_id varchar(255) CHARSET latin1 DEFAULT NULL,
            blob_holder char(36) CHARSET latin1 DEFAULT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

          ALTER TABLE communities
            ADD PRIMARY KEY (id);

          INSERT INTO communities (id)
          SELECT id
          FROM threads t
          WHERE t.depth = 0;
      `,
        { multipleStatements: true },
      );
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 65,
    migrationPromise: () =>
      dbQuery(SQL`
        ALTER TABLE invite_links
          ADD COLUMN IF NOT EXISTS thread bigint(20) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS thread_role bigint(20) DEFAULT NULL,
          ADD INDEX IF NOT EXISTS community_thread (community, thread);
      `),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 66,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 67,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 68,
    migrationPromise: updateRolesAndPermissionsForAllThreads,
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 69,
    migrationPromise: () =>
      addNewUserSurfacedPermission(userSurfacedPermissions.ADD_MEMBERS),
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 70,
    migrationPromise: async () => {
      const relationshipChangeset = new RelationshipChangeset();

      const threadToUsers = new Map<string, string[]>();
      const query = SQL`
        SELECT user, thread
        FROM memberships
        WHERE thread != ${genesis().id}
      `;
      const [results] = await dbQuery(query);
      for (const row of results) {
        const { user, thread } = row;
        let users = threadToUsers.get(thread);
        if (!users) {
          users = [];
          threadToUsers.set(thread, users);
        }
        users.push(user);
      }

      for (const [, users] of threadToUsers) {
        relationshipChangeset.setAllRelationshipsNeeded(users);
      }

      const relationshipRows = relationshipChangeset.getRows();
      await updateChangedUndirectedRelationships(relationshipRows);
    },
    migrationType: 'wrap_in_transaction_and_block_requests',
  },
  {
    version: 71,
    migrationPromise: async () => {
      const links = await fetchAllPrimaryInviteLinks();
      const promises = [];
      for (const link: InviteLinkWithHolder of links) {
        const holder = link.blobHolder;
        if (!holder) {
          continue;
        }
        promises.push(
          deleteBlob(
            {
              hash: inviteLinkBlobHash(inviteLinkBlobHash(link.name)),
              holder,
            },
            true,
          ),
        );
      }
      try {
        await Promise.all(promises);
      } catch (e) {
        console.log('Error while cleaning invite links blobs', e);
      }
    },
    migrationType: 'run_simultaneously_with_requests',
  },
  {
    version: 72,
    migrationPromise: () =>
      dbQuery(
        SQL`
          ALTER TABLE memberships
          ADD COLUMN IF NOT EXISTS last_message_for_unread_check
            bigint(20) NOT NULL DEFAULT 0;
          UPDATE memberships SET last_message_for_unread_check = last_message;
        `,
        { multipleStatements: true },
      ),
    migrationType: 'run_simultaneously_with_requests',
  },
  {
    version: 73,
    migrationPromise: () =>
      // This function calls updateRolesAndPermissionsForAllThreads which
      // should grant DELETE_OWN_MESSAGES and DELETE_ALL_MESSAGES to all the
      // admins
      addNewUserSurfacedPermission(userSurfacedPermissions.DELETE_OWN_MESSAGES),
    migrationType: 'run_simultaneously_with_requests',
  },
];
const versions: $ReadOnlyArray<number> = migrations.map(
  migration => migration.version,
);
const newDatabaseVersion: number = Math.max(...versions);

const wrapInTransactionAndBlockRequestsVersions = migrations
  .filter(
    migration =>
      !migration.migrationType ||
      migration.migrationType === 'wrap_in_transaction_and_block_requests',
  )
  .map(migration => migration.version);
const latestWrapInTransactionAndBlockRequestsVersion: number = Math.max(
  ...wrapInTransactionAndBlockRequestsVersions,
);

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
  if (isDockerEnvironment()) {
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
  if (isDockerEnvironment()) {
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

  await saveNewOlmAccounts(pickledContentAccount, pickledNotificationsAccount);
}

async function saveNewOlmAccounts(
  pickledContentAccount: PickledOlmAccount,
  pickledNotificationsAccount: PickledOlmAccount,
) {
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

function isDockerEnvironment(): boolean {
  return !!process.env.COMM_DATABASE_HOST;
}

async function addNewUserSurfacedPermission(
  permission: UserSurfacedPermission,
) {
  // We're filtering out admin roles because a new permission should be set
  // to true in baseAdminPermissions inside
  // getRolePermissionBlobsForCommunityRoot
  const [result] = await dbQuery(SQL`
    SELECT r.id, r.permissions
    FROM threads t
    LEFT JOIN roles r ON r.thread = t.id
      WHERE t.community IS NULL
      AND t.type != ${threadTypes.GENESIS}
      AND r.special_role != ${specialRoles.ADMIN_ROLE}
  `);

  const rolePermissionsToUpdate = new Map<string, ThreadRolePermissionsBlob>();
  for (const row of result) {
    const { id, permissions: permissionsString } = row;
    const permissions = JSON.parse(permissionsString);
    const userSurfaced =
      userSurfacedPermissionsFromRolePermissions(permissions);
    if (userSurfaced.has(permission)) {
      continue;
    }
    const newPermissions = toggleUserSurfacedPermission(
      permissions,
      permission,
    );
    rolePermissionsToUpdate.set(id, newPermissions);
  }

  if (rolePermissionsToUpdate.size > 0) {
    const updateQuery = SQL`
      UPDATE roles
      SET permissions = CASE id
    `;
    for (const [id, permissions] of rolePermissionsToUpdate) {
      console.log(`updating ${id} to ${JSON.stringify(permissions)}`);
      const permissionsBlob = JSON.stringify(permissions);
      updateQuery.append(SQL`
        WHEN ${id} THEN ${permissionsBlob}
      `);
    }
    updateQuery.append(SQL`
        ELSE permissions
      END
    `);
    await dbQuery(updateQuery);
  }

  // Calling this also results in recalculating roles for admins, if
  // baseAdminPermissions was also changed
  await updateRolesAndPermissionsForAllThreads();
}

export {
  migrations,
  newDatabaseVersion,
  latestWrapInTransactionAndBlockRequestsVersion,
  createOlmAccounts,
  saveNewOlmAccounts,
};
