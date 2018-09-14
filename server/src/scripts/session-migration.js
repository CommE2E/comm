// @flow

import { pool, dbQuery, SQL } from '../database';
import createIDs from '../creators/id-creator';

async function main() {
  try {
    await migrateFiltersTableToSessions();
    await migrateSessionsRelatedColumns();
    await migrateUpdatesTable();
    await cleanup();
    pool.end();
  } catch (e) {
    pool.end();
    console.warn(e);
  }
}

async function migrateFiltersTableToSessions() {
  await dbQuery(SQL`RENAME TABLE filters TO sessions`);
  await dbQuery(SQL`ALTER TABLE sessions ADD id BIGINT(20) NOT NULL FIRST`);
  await dbQuery(
    SQL`ALTER TABLE sessions ADD cookie BIGINT(20) NOT NULL AFTER user`,
  );
  await dbQuery(
    SQL`ALTER TABLE sessions ADD last_update BIGINT(20) NOT NULL AFTER time`
  );

  const [ result ] = await dbQuery(SQL`
    SELECT s.session, s.user, s.query, s.time,
      SUBSTRING_INDEX(s.session, '|', 1) AS cookie,
      IF(
        s.session LIKE '%|%',
        SUBSTRING_INDEX(s.session, '|', -1),
        NULL
      ) AS old_session_id,
      c.last_update
    FROM sessions s
    LEFT JOIN cookies c ON c.id = SUBSTRING_INDEX(s.session, '|', 1)
    WHERE s.id = 0
  `);
  const newColumns = [], needID = [];
  for (let row of result) {
    if (!row.last_update) {
      continue;
    }
    if (!row.old_session_id) {
      newColumns.push([
        row.cookie,
        row.user,
        row.cookie,
        row.session,
        JSON.stringify(row.query),
        row.time,
        row.last_update,
      ]);
    } else {
      needID.push([
        row.user,
        row.cookie,
        row.session,
        JSON.stringify(row.query),
        row.time,
        row.last_update,
      ]);
    }
  }
  const ids = await createIDs("sessions", needID.length);
  for (let row of needID) {
    const id = ids.pop();
    newColumns.push([ id, ...row ]);
  }
  if (newColumns.length > 0) {
    await dbQuery(SQL`
      INSERT INTO sessions (id, user, cookie, session, query, time, last_update)
      VALUES ${newColumns}
      ON DUPLICATE KEY UPDATE
        id = VALUES(id),
        cookie = VALUES(cookie),
        last_update = VALUES(last_update)
    `);
  }
}

async function migrateSessionsRelatedColumns() {
  await dbQuery(
    SQL`ALTER TABLE focused CHANGE cookie session BIGINT(20) NOT NULL`
  );
  await dbQuery(SQL`ALTER TABLE revisions DROP session_id`);
  await dbQuery(SQL`
    ALTER TABLE revisions ADD session BIGINT(20) NOT NULL AFTER creation_time
  `);
}

async function migrateUpdatesTable() {
  await dbQuery(SQL`
    ALTER TABLE updates CHANGE updater old_updater VARCHAR(255)
    CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL
  `);
  await dbQuery(SQL`
    ALTER TABLE updates CHANGE target old_target VARCHAR(255)
    CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT NULL
  `);
  await dbQuery(SQL`
    ALTER TABLE updates
    ADD updater BIGINT(20) NULL DEFAULT NULL AFTER \`key\`,
    ADD target BIGINT(20) NULL DEFAULT NULL AFTER updater
  `);
  await dbQuery(SQL`
    UPDATE updates u
    LEFT JOIN sessions s1 ON s1.session = u.old_updater
    LEFT JOIN sessions s2 ON s2.session = u.old_target
    SET u.updater = s1.id, u.target = s2.id
  `);
}

async function cleanup() {
  await dbQuery(SQL`ALTER TABLE sessions DROP PRIMARY KEY`);
  await dbQuery(SQL`ALTER TABLE sessions ADD PRIMARY KEY(id)`);
  await dbQuery(SQL`ALTER TABLE sessions DROP session`);
  await dbQuery(SQL`ALTER TABLE cookies DROP last_update`);
  await dbQuery(SQL`ALTER TABLE updates DROP old_updater, DROP old_target`);
}

main();
