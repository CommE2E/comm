// @flow

import type { PolicyType } from 'lib/facts/policies.js';
import { type UserPolicyConfirmationType } from 'lib/types/policy-types.js';

import { dbQuery, mergeOrConditions, SQL } from '../database/database.js';
import { Viewer } from '../session/viewer.js';

async function fetchPolicyAcknowledgments(
  viewer: Viewer,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<UserPolicyConfirmationType> {
  const query = SQL`SELECT policy, confirmed FROM policy_acknowledgments `;
  query.append(`WHERE `);
  query.append(`user=${viewer.id} AND`);
  const orConditions = policies.map(policy => SQL`policy=${policy}`);
  query.append(mergeOrConditions(orConditions));

  const [data] = await dbQuery(query);
  return data;
}

export { fetchPolicyAcknowledgments };
