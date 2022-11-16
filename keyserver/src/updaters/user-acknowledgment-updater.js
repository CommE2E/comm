// @flow

import type { PolicyType } from 'lib/facts/policies.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function userAcknowledgmentUpdater(viewer: Viewer, policy: PolicyType) {
  if (!viewer.loggedIn) {
    return;
  }

  const time = Date.now();
  await dbQuery(SQL`
    INSERT INTO policy_acknowledgments (user, policy, date, confirmed)
    VALUES (${viewer.data.id}, ${policy}, ${time}, 1)
    ON DUPLICATE KEY UPDATE
     date = IF (confirmed = 1, date, ${time}),
     confirmed = 1;
  `);
}

export { userAcknowledgmentUpdater };
