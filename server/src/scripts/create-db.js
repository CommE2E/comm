// @flow

import { threadTypes } from 'lib/types/thread-types';
import { undirectedStatus } from 'lib/types/relationship-types';

import ashoat from 'lib/facts/ashoat';
import bots from 'lib/facts/bots';
import {
  makePermissionsBlob,
  makePermissionsForChildrenBlob,
} from 'lib/permissions/thread-permissions';
import { sortIDs } from 'lib/shared/relationship-utils';

import { setScriptContext } from './script-context';
import { endScript } from './utils';
import { dbQuery, SQL } from '../database';
import { getRolePermissionBlobsForChat } from '../creators/role-creator';

setScriptContext({
  allowMultiStatementSQLQueries: true,
});

async function main() {
  try {
    await createTables();
    await createUsers();
    await createThreads();
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

async function createTables() {
  await dbQuery(SQL`
    CREATE TABLE cookies (
      id bigint(20) NOT NULL,
      hash char(60) NOT NULL,
      user bigint(20) DEFAULT NULL,
      platform varchar(255) DEFAULT NULL,
      creation_time bigint(20) NOT NULL,
      last_used bigint(20) NOT NULL,
      device_token varchar(255) DEFAULT NULL,
      versions json DEFAULT NULL
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
      creator bigint(20) NOT NULL,
      creation_time bigint(20) NOT NULL,
      last_update bigint(20) NOT NULL,
      deleted tinyint(1) UNSIGNED NOT NULL,
      creation varchar(255) COLLATE utf8mb4_bin DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

    CREATE TABLE focused (
      user bigint(20) NOT NULL,
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
      user bigint(20) NOT NULL,
      role bigint(20) NOT NULL,
      permissions json NOT NULL,
      permissions_for_children json DEFAULT NULL,
      creation_time bigint(20) NOT NULL,
      subscription json NOT NULL,
      unread tinyint(1) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE messages (
      id bigint(20) NOT NULL,
      thread bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
      type tinyint(3) UNSIGNED NOT NULL,
      content mediumtext COLLATE utf8mb4_bin,
      time bigint(20) NOT NULL,
      creation varchar(255) COLLATE utf8mb4_bin DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

    CREATE TABLE notifications (
      id bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
      thread bigint(20) NOT NULL,
      message bigint(20) NOT NULL,
      collapse_key varchar(255) DEFAULT NULL,
      delivery json NOT NULL,
      rescinded tinyint(1) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE reports (
      id bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
      type tinyint(3) UNSIGNED NOT NULL,
      platform varchar(255) NOT NULL,
      report json NOT NULL,
      creation_time bigint(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE revisions (
      id bigint(20) NOT NULL,
      entry bigint(20) NOT NULL,
      author bigint(20) NOT NULL,
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
      creation_time bigint(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE sessions (
      id bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
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
      default_role bigint(20) NOT NULL,
      creator bigint(20) NOT NULL,
      creation_time bigint(20) NOT NULL,
      color char(6) COLLATE utf8mb4_bin NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

    CREATE TABLE updates (
      id bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
      type tinyint(3) UNSIGNED NOT NULL,
      \`key\` bigint(20) DEFAULT NULL,
      updater bigint(20) DEFAULT NULL,
      target bigint(20) DEFAULT NULL,
      content mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
      time bigint(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE uploads (
      id bigint(20) NOT NULL,
      uploader bigint(20) NOT NULL,
      container bigint(20) DEFAULT NULL,
      type varchar(255) NOT NULL,
      filename varchar(255) NOT NULL,
      mime varchar(255) NOT NULL,
      content longblob NOT NULL,
      secret varchar(255) NOT NULL,
      creation_time bigint(20) NOT NULL,
      extra json DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;

    CREATE TABLE users (
      id bigint(20) NOT NULL,
      username varchar(191) COLLATE utf8mb4_bin NOT NULL,
      hash char(60) COLLATE utf8mb4_bin NOT NULL,
      email varchar(191) COLLATE utf8mb4_bin NOT NULL,
      email_verified tinyint(1) UNSIGNED NOT NULL DEFAULT '0',
      avatar varchar(191) COLLATE utf8mb4_bin DEFAULT NULL,
      creation_time bigint(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

    CREATE TABLE relationships_undirected (
      user1 bigint(20) NOT NULL,
      user2 bigint(20) NOT NULL,
      status tinyint(1) UNSIGNED NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE relationships_directed (
      user1 bigint(20) NOT NULL,
      user2 bigint(20) NOT NULL,
      status tinyint(1) UNSIGNED NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE verifications (
      id bigint(20) NOT NULL,
      user bigint(20) NOT NULL,
      field tinyint(1) UNSIGNED NOT NULL,
      hash char(60) NOT NULL,
      creation_time bigint(20) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;

    CREATE TABLE versions (
      id bigint(20) NOT NULL,
      code_version int(11) NOT NULL,
      platform varchar(255) NOT NULL,
      creation_time bigint(20) NOT NULL,
      deploy_time bigint(20) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;


    ALTER TABLE cookies
      ADD PRIMARY KEY (id),
      ADD UNIQUE KEY device_token (device_token),
      ADD KEY user_device_token (user,device_token);

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
      ADD UNIQUE KEY thread_user (thread,user) USING BTREE,
      ADD KEY role (role) USING BTREE;

    ALTER TABLE messages
      ADD PRIMARY KEY (id),
      ADD UNIQUE KEY user_creation (user,creation),
      ADD KEY thread (thread);

    ALTER TABLE notifications
      ADD PRIMARY KEY (id),
      ADD KEY rescinded_user_collapse_key (rescinded,user,collapse_key)
        USING BTREE,
      ADD KEY thread (thread),
      ADD KEY rescinded_user_thread_message (rescinded,user,thread,message)
        USING BTREE;

    ALTER TABLE reports
      ADD PRIMARY KEY (id);

    ALTER TABLE revisions
      ADD PRIMARY KEY (id),
      ADD KEY entry (entry);

    ALTER TABLE roles
      ADD PRIMARY KEY (id),
      ADD KEY thread (thread);

    ALTER TABLE sessions
      ADD PRIMARY KEY (id),
      ADD KEY user (user);

    ALTER TABLE threads
      ADD PRIMARY KEY (id);

    ALTER TABLE updates
      ADD PRIMARY KEY (id),
      ADD KEY user_time (user,time),
      ADD KEY user_key_type (user,\`key\`,type);

    ALTER TABLE uploads
      ADD PRIMARY KEY (id);

    ALTER TABLE users
      ADD PRIMARY KEY (id),
      ADD UNIQUE KEY username (username),
      ADD UNIQUE KEY email (email);

    ALTER TABLE relationships_undirected
      ADD UNIQUE KEY user1_user2 (user1,user2),
      ADD UNIQUE KEY user2_user1 (user2,user1);

    ALTER TABLE relationships_directed
      ADD UNIQUE KEY user1_user2 (user1,user2);

    ALTER TABLE verifications
      ADD PRIMARY KEY (id),
      ADD KEY user_field (user,field);

    ALTER TABLE versions
      ADD PRIMARY KEY (id),
      ADD UNIQUE KEY code_version_platform (code_version,platform);


    ALTER TABLE ids
      MODIFY id bigint(20) NOT NULL AUTO_INCREMENT;
  `);
}

async function createUsers() {
  const [user1, user2] = sortIDs(bots.squadbot.userID, ashoat.id);
  await dbQuery(SQL`
    INSERT INTO ids (id, table_name)
      VALUES
        (${bots.squadbot.userID}, 'users'),
        (${ashoat.id}, 'users');
    INSERT INTO users (id, username, hash, email, email_verified, avatar,
        creation_time)
      VALUES
        (${bots.squadbot.userID}, 'squadbot', '', 'squadbot@squadcal.org', 1,
          NULL, 1530049900980),
        (${ashoat.id}, 'ashoat', '', ${ashoat.email}, 1,
          NULL, 1463588881886);
    INSERT INTO relationships_undirected (user1, user2, status)
      VALUES (${user1}, ${user2}, ${undirectedStatus.KNOW_OF});
  `);
}

async function createThreads() {
  const staffSquadbotThreadRoleID = 118821;
  const defaultRolePermissions = getRolePermissionBlobsForChat(
    threadTypes.CHAT_SECRET,
  ).defaultPermissions;
  const membershipPermissions = makePermissionsBlob(
    defaultRolePermissions,
    null,
    bots.squadbot.staffThreadID,
    threadTypes.CHAT_SECRET,
  );
  const membershipPermissionsString = JSON.stringify(membershipPermissions);
  const membershipChildPermissionsString = JSON.stringify(
    makePermissionsForChildrenBlob(membershipPermissions),
  );
  const subscriptionString = JSON.stringify({ home: true, pushNotifs: true });
  await dbQuery(SQL`
    INSERT INTO ids (id, table_name)
      VALUES
        (${bots.squadbot.staffThreadID}, 'threads'),
        (${staffSquadbotThreadRoleID}, 'roles');
    INSERT INTO roles (id, thread, name, permissions, creation_time)
      VALUES
        (${staffSquadbotThreadRoleID}, ${bots.squadbot.staffThreadID},
          'Members', ${JSON.stringify(defaultRolePermissions)}, 1530049901882);
    INSERT INTO threads (id, type, name, description, parent_thread_id,
        default_role, creator, creation_time, color)
      VALUES
        (${bots.squadbot.staffThreadID}, ${threadTypes.CHAT_SECRET}, NULL, NULL,
          NULL, ${staffSquadbotThreadRoleID}, ${bots.squadbot.userID},
          1530049901942, 'ef1a63');
    INSERT INTO memberships (thread, user, role, permissions,
        permissions_for_children, creation_time, subscription, unread)
      VALUES
        (${bots.squadbot.staffThreadID}, ${bots.squadbot.userID},
          ${staffSquadbotThreadRoleID}, ${membershipPermissionsString},
          ${membershipChildPermissionsString}, 1530049902080,
          ${subscriptionString}, 0),
        (${bots.squadbot.staffThreadID}, ${ashoat.id},
          ${staffSquadbotThreadRoleID}, ${membershipPermissionsString},
          ${membershipChildPermissionsString}, 1530049902080,
          ${subscriptionString}, 0);
  `);
}

main();
