// @flow

import { policies } from 'lib/facts/policies.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function userAcknowledgmentUpdater(viewer: Viewer) {
  if (!viewer.loggedIn) {
    return;
  }

  const [userPolicies] = await dbQuery(SQL`
    SELECT policy, confirmed 
    FROM policy_acknowledgments 
    WHERE user = ${viewer.data.id}
  `);

  const time = Date.now();
  const updates = policies.map(policy => {
    const userPolicyData = userPolicies.find(row => row.policy === policy);
    if (userPolicyData?.confirmed) {
      return;
    }

    return dbQuery(SQL`
      INSERT INTO policy_acknowledgments (user, policy, date, confirmed)
        VALUES (${viewer.data.id}, ${policy}, ${time}, 1)
        ON DUPLICATE KEY UPDATE
         SET confirmed = 1, date = ${time}
         WHERE user = ${viewer.data.id} AND policy = ${policy};
    `);
  });

  await Promise.all(updates);
}

export { userAcknowledgmentUpdater };
