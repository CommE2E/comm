// @flow

import { policyTypes } from 'lib/facts/policies.js';

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

// time when policy was officially published for users
const policyUpdateTime = new Date('2023-02-03T00:00:00').getTime();

async function forcePolicyAcknowledgment() {
  await dbQuery(SQL`
    UPDATE policy_acknowledgments
    SET confirmed = 0
    WHERE date <= ${policyUpdateTime} 
      AND policy = ${policyTypes.tosAndPrivacyPolicy}
  `);
}

main([forcePolicyAcknowledgment]);
