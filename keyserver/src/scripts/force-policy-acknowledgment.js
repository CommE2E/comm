// @flow
import { policyTypes } from 'lib/facts/policies.js';

import { dbQuery, SQL } from '../database/database.js';
import { main } from './utils.js';

const policy = policyTypes.tosAndPrivacyPolicy;
// time when policy was officially published for users
const policyUpdateTime = new Date('2022-10-30T00:00:00').getTime();

async function forcePolicyAcknowledgment() {
  await dbQuery(SQL`
    UPDATE policy_acknowledgments
        SET confirmed = 0
        WHERE date <= ${policyUpdateTime} AND policy = ${policy};
  `);
}

main([forcePolicyAcknowledgment]);
