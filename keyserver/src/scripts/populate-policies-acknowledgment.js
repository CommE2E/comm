// @flow

import { policyTypes } from '../../dist/lib/facts/policies.js';
import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

// this function populate accepted policy for existing users
async function populatePoliciesAcknowledgment() {
  const time = Date.now();

  await dbQuery(SQL`
    INSERT IGNORE INTO policy_acknowledgments (policy, user, date, confirmed)
      SELECT ${policyTypes.tosAndPrivacyPolicy}, id, ${time}, 1
      FROM users;
  `);
}

main([populatePoliciesAcknowledgment]);
