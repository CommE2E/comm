// @flow

import type { PolicyType } from '../facts/policies.js';

export type UserPolicyConfirmationType = {
  policy: PolicyType,
  confirmed: boolean,
}[];

export type UserPolicyState = {
  isAcknowledged: boolean,
};

export type UserPolicies = {
  [name: PolicyType]: UserPolicyState,
};

export type ForcePolicyAcknowledgmentPayload = {
  notAcknowledgedPolicies: $ReadOnlyArray<PolicyType>,
};

export type PolicyAcknowledgmentPayload = {
  policy: PolicyType,
};

export const forcePolicyAcknowledgmentActionType =
  'FORCE_POLICY_ACKNOWLEDGMENT';
