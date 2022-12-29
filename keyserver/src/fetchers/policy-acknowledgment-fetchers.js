// @flow

import type { PolicyType } from 'lib/facts/policies.js';
import { type UserPolicyConfirmationType } from 'lib/types/policy-types.js';

import { dbQuery, SQL } from '../database/database.js';
import { Viewer } from '../session/viewer.js';

async function fetchPolicyAcknowledgments(
  viewer: Viewer,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<$ReadOnlyArray<UserPolicyConfirmationType>> {
  const query = SQL`
    SELECT policy, confirmed
    FROM policy_acknowledgments
    WHERE user=${viewer.id}
      AND policy IN (${policies})
  `;
  const [data] = await dbQuery(query);
  return data;
}

async function fetchNotAcknowledgedPolicies(
  viewer: Viewer,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<$ReadOnlyArray<PolicyType>> {
  const viewerAcknowledgments = await fetchPolicyAcknowledgments(
    viewer,
    policies,
  );
  return policies.filter(policy => {
    const policyAcknowledgment = viewerAcknowledgments.find(
      viewerAcknowledgment => viewerAcknowledgment.policy === policy,
    );
    return !policyAcknowledgment?.confirmed;
  });
}

export { fetchPolicyAcknowledgments, fetchNotAcknowledgedPolicies };
