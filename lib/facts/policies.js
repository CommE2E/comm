// @flow

import { values } from '../utils/objects.js';

export const policyTypes = Object.freeze({
  tosAndPrivacyPolicy: 'TERMS_OF_USE_AND_PRIVACY_POLICY',
});

export const policies: $ReadOnlyArray<string> = values(policyTypes);

export type PolicyType = $Values<typeof policyTypes>;

export const baseLegalPolicies = [policyTypes.tosAndPrivacyPolicy];
