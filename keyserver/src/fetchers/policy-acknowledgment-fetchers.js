// @flow

import type { PolicyType } from 'lib/facts/policies.js';
import { type UserPolicyConfirmationType } from 'lib/types/policy-types.js';

import { dbQuery, SQL } from '../database/database.js';

async function fetchPolicyAcknowledgments(
  userID: string,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<$ReadOnlyArray<UserPolicyConfirmationType>> {
  const query = SQL`
    SELECT policy, confirmed
    FROM policy_acknowledgments
    WHERE user=${userID}
      AND policy IN (${policies})
  `;
  const [data] = await dbQuery(query);
  return data;
}

async function fetchNotAcknowledgedPolicies(
  userID: string,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<$ReadOnlyArray<PolicyType>> {
  const viewerAcknowledgments = await fetchPolicyAcknowledgments(
    userID,
    policies,
  );
  return policies.filter(policy => {
    const policyAcknowledgment = viewerAcknowledgments.find(
      viewerAcknowledgment => viewerAcknowledgment.policy === policy,
    );
    return !policyAcknowledgment?.confirmed;
  });
}

async function hasAnyNotAcknowledgedPolicies(
  userID: string,
  policies: $ReadOnlyArray<PolicyType>,
): Promise<boolean> {
  const notAcknowledgedPolicies = await fetchNotAcknowledgedPolicies(
    userID,
    policies,
  );
  return !!notAcknowledgedPolicies.length;
}

export {
  fetchPolicyAcknowledgments,
  fetchNotAcknowledgedPolicies,
  hasAnyNotAcknowledgedPolicies,
};
