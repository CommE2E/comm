// @flow

import {
  legacyLogInActionTypes,
  logOutActionTypes,
  policyAcknowledgmentActionTypes,
  keyserverAuthActionTypes,
} from '../actions/user-actions.js';
import type { PolicyType } from '../facts/policies.js';
import {
  type UserPolicies,
  forcePolicyAcknowledgmentActionType,
} from '../types/policy-types.js';
import type { BaseAction } from '../types/redux-types.js';

function policiesReducer(
  state: UserPolicies,
  action: BaseAction,
): UserPolicies {
  if (
    action.type === forcePolicyAcknowledgmentActionType ||
    action.type === legacyLogInActionTypes.success ||
    action.type === keyserverAuthActionTypes.success
  ) {
    const { notAcknowledgedPolicies } = action.payload;
    if (!notAcknowledgedPolicies) {
      return state;
    }
    const newState = { ...state };

    notAcknowledgedPolicies.forEach((policy: PolicyType) => {
      newState[policy] = {
        ...newState[policy],
        isAcknowledged: false,
      };
    });
    return newState;
  } else if (action.type === policyAcknowledgmentActionTypes.success) {
    const { policy } = action.payload;
    return {
      ...state,
      [policy]: {
        ...state[policy],
        isAcknowledged: true,
      },
    };
  } else if (action.type === logOutActionTypes.started) {
    return {};
  }
  return state;
}

export default policiesReducer;
