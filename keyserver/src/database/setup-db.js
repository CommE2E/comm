// @flow

import bots from 'lib/facts/bots.js';
import genesis from 'lib/facts/genesis.js';
import { usernameMaxLength } from 'lib/shared/account-utils.js';
import { sortUserIDs } from 'lib/shared/relationship-utils.js';
import { undirectedStatus } from 'lib/types/relationship-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';

import { createThread } from '../creators/thread-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { updateDBVersion } from '../database/db-version.js';
import {
  newDatabaseVersion,
  saveNewOlmAccounts,
} from '../database/migration-config.js';
import { createScriptViewer } from '../session/scripts.js';
import { ensureUserCredentials } from '../user/checks.js';
import {
  thisKeyserverAdmin,
  saveIdentityInfo,
  isAuthoritativeKeyserver,
} from '../user/identity.js';
import { verifyUserLoggedInWithoutDB } from '../user/login.js';
import { createPickledOlmAccount } from '../utils/olm-utils.js';

async function setupDB() {
  const [pickledContentAccount, pickledNotificationsAccount] =
    await Promise.all([createPickledOlmAccount(), createPickledOlmAccount()]);

  const {
    identityInfo,
    pickledContentAccount: contentAccount,
    pickledNotificationsAccount: notificationsAccount,
  } = await verifyUserLoggedInWithoutDB(
    pickledContentAccount,
    pickledNotificationsAccount,
  );
  await ensureUserCredentials();
  await createTables();
  await saveNewOlmAccounts(contentAccount, notificationsAccount);
  await saveIdentityInfo(identityInfo);
  await createUsers();
  await createThreads();
  await setUpMetadataTable();
}

async function createTables() {
  await dbQuery(
    SQL`
      CREATE TABLE cookies (
        id bigint(20) NOT NULL,
        hash char(64) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin DEFAULT NULL,
        platform varchar(255) DEFAULT NULL,
        creation_time bigint(20) NOT NULL,
        last_used bigint(20) NOT NULL,
        device_token mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        versions json DEFAULT NULL,
        device_id varchar(255) DEFAULT NULL,
        signed_identity_keys mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        social_proof mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
        \`primary\` TINYINT(1) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE days (
        id bigint(20) NOT NULL,
        date date NOT NULL,
        thread bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE entries (
        id bigint(20) NOT NULL,
        day bigint(20) NOT NULL,
        text mediumtext COLLATE utf8mb4_bin NOT NULL,
        creator varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        creation_time bigint(20) NOT NULL,
        last_update bigint(20) NOT NULL,
        deleted tinyint(1) UNSIGNED NOT NULL,
        creation varchar(255) COLLATE utf8mb4_bin DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE focused (
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        session bigint(20) NOT NULL,
        thread bigint(20) NOT NULL,
        time bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE ids (
        id bigint(20) NOT NULL,
        table_name varchar(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE memberships (
        thread bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        role bigint(20) NOT NULL,
        permissions json DEFAULT NULL,
        permissions_for_children json DEFAULT NULL,
        creation_time bigint(20) NOT NULL,
        subscription json NOT NULL,
        last_message bigint(20) NOT NULL DEFAULT 0,
        last_message_for_unread_check bigint(20) NOT NULL DEFAULT 0,
        last_read_message bigint(20) NOT NULL DEFAULT 0,
        sender tinyint(1) UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE messages (
        id bigint(20) NOT NULL,
        thread bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        type tinyint(3) UNSIGNED NOT NULL,
        content mediumtext COLLATE utf8mb4_bin,
        time bigint(20) NOT NULL,
        creation varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
        target_message bigint(20) DEFAULT NULL,
        pinned tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
        pin_time bigint(20) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE notifications (
        id bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        thread bigint(20) DEFAULT NULL,
        message bigint(20) DEFAULT NULL,
        collapse_key varchar(255) DEFAULT NULL,
        delivery json NOT NULL,
        rescinded tinyint(1) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE reports (
        id bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        type tinyint(3) UNSIGNED NOT NULL,
        platform varchar(255) NOT NULL,
        report json NOT NULL,
        creation_time bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE revisions (
        id bigint(20) NOT NULL,
        entry bigint(20) NOT NULL,
        author varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        text mediumtext COLLATE utf8mb4_bin NOT NULL,
        creation_time bigint(20) NOT NULL,
        session bigint(20) NOT NULL,
        last_update bigint(20) NOT NULL,
        deleted tinyint(1) UNSIGNED NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE roles (
        id bigint(20) NOT NULL,
        thread bigint(20) NOT NULL,
        name varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
        permissions json NOT NULL,
        creation_time bigint(20) NOT NULL,
        special_role tinyint(2) UNSIGNED DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE sessions (
        id bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        cookie bigint(20) NOT NULL,
        query json NOT NULL,
        creation_time bigint(20) NOT NULL,
        last_update bigint(20) NOT NULL,
        last_validated bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE threads (
        id bigint(20) NOT NULL,
        type tinyint(3) NOT NULL,
        name varchar(191) COLLATE utf8mb4_bin DEFAULT NULL,
        description mediumtext COLLATE utf8mb4_bin,
        parent_thread_id bigint(20) DEFAULT NULL,
        containing_thread_id bigint(20) DEFAULT NULL,
        community bigint(20) DEFAULT NULL,
        depth int UNSIGNED NOT NULL DEFAULT 0,
        creator varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        creation_time bigint(20) NOT NULL,
        color char(6) COLLATE utf8mb4_bin NOT NULL,
        source_message bigint(20) DEFAULT NULL UNIQUE,
        replies_count int UNSIGNED NOT NULL DEFAULT 0,
        avatar varchar(191) COLLATE utf8mb4_bin DEFAULT NULL,
        pinned_count int UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE updates (
        id bigint(20) NOT NULL,
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        type tinyint(3) UNSIGNED NOT NULL,
        \`key\` varchar(255) CHARSET latin1 COLLATE latin1_bin DEFAULT NULL,
        updater bigint(20) DEFAULT NULL,
        target bigint(20) DEFAULT NULL,
        content mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
        time bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE uploads (
        id bigint(20) NOT NULL,
        thread bigint(20) DEFAULT NULL,
        uploader varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        container bigint(20) DEFAULT NULL,
        user_container varchar(255)
          CHARSET latin1 COLLATE latin1_bin DEFAULT NULL,
        type varchar(255) CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL,
        filename varchar(255) NOT NULL,
        mime varchar(255) CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL,
        content longblob NOT NULL,
        secret varchar(255) CHARSET latin1 COLLATE latin1_swedish_ci NOT NULL,
        creation_time bigint(20) NOT NULL,
        extra json DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE users (
        id varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        username varchar(${usernameMaxLength}) COLLATE utf8mb4_bin NOT NULL,
        hash char(60) COLLATE utf8mb4_bin DEFAULT NULL,
        avatar varchar(191) COLLATE utf8mb4_bin DEFAULT NULL,
        ethereum_address char(42) DEFAULT NULL,
        creation_time bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE relationships_undirected (
        user1 varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        user2 varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        status tinyint(1) UNSIGNED NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE relationships_directed (
        user1 varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        user2 varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        status tinyint(1) UNSIGNED NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

      CREATE TABLE user_messages (
        recipient varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        thread bigint(20) NOT NULL,
        message bigint(20) NOT NULL,
        time bigint(20) NOT NULL,
        data mediumtext COLLATE utf8mb4_bin DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE settings (
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        name varchar(255) NOT NULL,
        data mediumtext COLLATE utf8mb4_bin DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE metadata (
        name varchar(255) NOT NULL,
        data varchar(1023)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
      
      CREATE TABLE policy_acknowledgments (
        user varchar(255) CHARSET latin1 COLLATE latin1_bin NOT NULL,
        policy varchar(255) NOT NULL,
        date bigint(20) NOT NULL,
        confirmed tinyint(1) UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

      CREATE TABLE siwe_nonces (
        nonce char(17) NOT NULL,
        creation_time bigint(20) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

      CREATE TABLE message_search (
        original_message_id bigint(20) NOT NULL,
        message_id bigint(20) NOT NULL,
        processed_content mediumtext COLLATE utf8mb4_bin
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      CREATE TABLE invite_links (
        id bigint(20) NOT NULL,
        name varchar(255) CHARSET latin1 NOT NULL,
        \`primary\` tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
        role bigint(20) NOT NULL,
        community bigint(20) NOT NULL,
        expiration_time bigint(20),
        limit_of_uses int UNSIGNED,
        number_of_uses int UNSIGNED NOT NULL DEFAULT 0,
        blob_holder char(36) CHARSET latin1,
        thread bigint(20) DEFAULT NULL,
        thread_role bigint(20) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

      CREATE TABLE olm_sessions (
        cookie_id bigint(20) NOT NULL,
        is_content tinyint(1) NOT NULL,
        version bigint(20) NOT NULL,
        pickled_olm_session text 
          CHARACTER SET latin1 
          COLLATE latin1_bin NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_bin;

      CREATE TABLE olm_accounts (
        is_content tinyint(1) NOT NULL,
        version bigint(20) NOT NULL,
        pickling_key text 
          CHARACTER SET latin1 
          COLLATE latin1_bin NOT NULL,
        pickled_olm_account text 
          CHARACTER SET latin1 
          COLLATE latin1_bin NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_bin;

      CREATE TABLE communities (
        id bigint(20) NOT NULL,
        farcaster_channel_id varchar(255) CHARSET latin1 DEFAULT NULL,
        blob_holder char(36) CHARSET latin1 DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

      ALTER TABLE cookies
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY device_token (device_token(512)),
        ADD KEY user_device_token (user,device_token(512));

      ALTER TABLE days
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY date_thread (date,thread) USING BTREE;

      ALTER TABLE entries
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY creator_creation (creator,creation),
        ADD KEY day (day);

      ALTER TABLE focused
        ADD UNIQUE KEY user_cookie_thread (user,session,thread),
        ADD KEY thread_user (thread,user);

      ALTER TABLE ids
        ADD PRIMARY KEY (id);

      ALTER TABLE memberships
        ADD UNIQUE KEY thread_user (thread, user) USING BTREE,
        ADD KEY role (role) USING BTREE,
        ADD KEY user_role_thread (user, role, thread);

      ALTER TABLE messages
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY user_creation (user,creation),
        ADD KEY thread (thread),
        ADD INDEX target_message (target_message),
        ADD INDEX thread_pinned (thread, pinned);

      ALTER TABLE notifications
        ADD PRIMARY KEY (id),
        ADD KEY rescinded_user_collapse_key (rescinded,user,collapse_key)
          USING BTREE,
        ADD KEY thread (thread),
        ADD KEY rescinded_user_thread_message (rescinded,user,thread,message)
          USING BTREE;

      ALTER TABLE notifications ADD INDEX user (user);

      ALTER TABLE reports
        ADD PRIMARY KEY (id),
        ADD INDEX user_type_platform_creation_time
          (user, type, platform, creation_time);

      ALTER TABLE revisions
        ADD PRIMARY KEY (id),
        ADD KEY entry (entry);

      ALTER TABLE roles
        ADD PRIMARY KEY (id),
        ADD KEY thread_special_role (thread, special_role),
        ADD UNIQUE KEY thread_name (thread, name);

      ALTER TABLE sessions
        ADD PRIMARY KEY (id),
        ADD KEY user (user);

      ALTER TABLE threads
        ADD PRIMARY KEY (id),
        ADD INDEX parent_thread_id (parent_thread_id),
        ADD INDEX containing_thread_id (containing_thread_id),
        ADD INDEX community (community);

      ALTER TABLE updates
        ADD PRIMARY KEY (id),
        ADD INDEX user_time (user,time),
        ADD INDEX target_time (target, time),
        ADD INDEX user_key_target_type_time (user, \`key\`, target, type, time),
        ADD INDEX user_key_type_time (user, \`key\`, type, time),
        ADD INDEX user_key_time (user, \`key\`, time);

      ALTER TABLE uploads
        ADD PRIMARY KEY (id),
        ADD INDEX container (container),
        ADD INDEX user_container (user_container),
        ADD INDEX thread (thread);

      ALTER TABLE users
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY username (username);

      ALTER TABLE relationships_undirected
        ADD UNIQUE KEY user1_user2 (user1,user2),
        ADD UNIQUE KEY user2_user1 (user2,user1);

      ALTER TABLE relationships_directed
        ADD UNIQUE KEY user1_user2 (user1,user2),
        ADD UNIQUE KEY user2_user1 (user2,user1);

      ALTER TABLE user_messages
        ADD INDEX recipient_time (recipient, time),
        ADD INDEX recipient_thread_time (recipient, thread, time),
        ADD INDEX thread (thread),
        ADD PRIMARY KEY (recipient, message);

      ALTER TABLE ids
        MODIFY id bigint(20) NOT NULL AUTO_INCREMENT;

      ALTER TABLE settings
        ADD PRIMARY KEY (user, name);

      ALTER TABLE metadata
        ADD PRIMARY KEY (name);
        
      ALTER TABLE policy_acknowledgments
        ADD PRIMARY KEY (user, policy);
        
      ALTER TABLE siwe_nonces
        ADD PRIMARY KEY (nonce);

      ALTER TABLE message_search
        ADD PRIMARY KEY (original_message_id),
        ADD FULLTEXT INDEX processed_content (processed_content);

      ALTER TABLE invite_links
        ADD PRIMARY KEY (id),
        ADD UNIQUE KEY (name),
        ADD INDEX community_primary (community, \`primary\`),
        ADD INDEX community_thread (community, thread);

      ALTER TABLE olm_sessions
        ADD PRIMARY KEY (cookie_id, is_content);
       
      ALTER TABLE olm_accounts
        ADD PRIMARY KEY (is_content);

      ALTER TABLE communities
        ADD PRIMARY KEY (id);
    `,
    { multipleStatements: true },
  );
}

async function createUsers() {
  const admin = await thisKeyserverAdmin();

  const [user1, user2] = sortUserIDs(bots.commbot.userID, admin.id);
  const query = SQL`
      INSERT INTO ids (id, table_name)
        VALUES
          (${bots.commbot.userID}, 'users');
      INSERT INTO users (id, username, hash, avatar, creation_time)
        VALUES
          (${bots.commbot.userID}, 'commbot', '', NULL, 1530049900980),
          (${admin.id}, ${admin.username}, '', NULL, 1463588881886);
      INSERT INTO relationships_undirected (user1, user2, status)
        VALUES (${user1}, ${user2}, ${undirectedStatus.KNOW_OF});
    `;

  if (!isNaN(Number(admin.id))) {
    query.append(SQL`
        INSERT INTO ids (id, table_name)
          VALUES (${admin.id}, 'users');
      `);
  }
  await dbQuery(query, { multipleStatements: true });
}

const createThreadOptions = { forceAddMembers: true };

async function createThreads() {
  const isAuthoritative = await isAuthoritativeKeyserver();

  if (!isAuthoritative) {
    return;
  }

  const insertIDsPromise = dbQuery(SQL`
    INSERT INTO ids (id, table_name)
    VALUES
      (${genesis().id}, 'threads'),
      (${bots.commbot.staffThreadID}, 'threads')
  `);

  const admin = await thisKeyserverAdmin();

  const ashoatViewer = createScriptViewer(admin.id);
  const createGenesisPromise = createThread(
    ashoatViewer,
    {
      id: genesis().id,
      type: threadTypes.GENESIS,
      name: genesis().name,
      description: genesis().description,
      initialMemberIDs: [bots.commbot.userID],
    },
    createThreadOptions,
  );
  await Promise.all([insertIDsPromise, createGenesisPromise]);

  const commbotViewer = createScriptViewer(bots.commbot.userID);
  await createThread(
    commbotViewer,
    {
      id: bots.commbot.staffThreadID,
      type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
      initialMemberIDs: [admin.id],
    },
    createThreadOptions,
  );
}

async function setUpMetadataTable() {
  await updateDBVersion(newDatabaseVersion);
}

export { setupDB };
