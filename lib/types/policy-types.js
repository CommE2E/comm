// @flow

import type { PolicyType } from '../facts/policies.js';

export type UserPolicyConfirmationType = {
  +policy: PolicyType,
  +confirmed: boolean,
};
