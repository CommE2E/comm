// @flow

import { pool, dbQuery, SQL } from '../database';
import createIDs from '../creators/id-creator';

async function main() {
  try {
    await migrateFiltersToSessions();
    pool.end();
  } catch (e) {
    pool.end();
    console.warn(e);
  }
}

async function migrateFiltersToSessions() {
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

  await dbQuery(SQL`ALTER TABLE sessions DROP PRIMARY KEY`);
  await dbQuery(SQL`ALTER TABLE sessions ADD PRIMARY KEY(id)`);
  await dbQuery(SQL`ALTER TABLE sessions DROP session`);
}

main();
