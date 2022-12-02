// @flow

import { policyAcknowledgmentActionTypes } from '../actions/user-actions.js';
import type { PolicyType } from '../facts/policies.js';
import type { PolicyAcknowledgmentRequest } from '../types/account-types.js';
import type { DispatchActionPromise } from './action-utils.js';

function acknowledgePolicy(
  policy: PolicyType,
  dispatchActionPromise: DispatchActionPromise,
  acknowledgmentServerCall: (
    request: PolicyAcknowledgmentRequest,
  ) => Promise<void>,
  onError: (message: string) => void,
) {
  const acknowledgePolicyPromise = (async () => {
    try {
      await acknowledgmentServerCall({ policy });
      return { policy };
    } catch (e) {
      console.warn('error acknowledging policy', e);
      onError('unknown error');
      throw e;
    }
  })();
  dispatchActionPromise(
    policyAcknowledgmentActionTypes,
    acknowledgePolicyPromise,
    undefined,
    { policy },
  );
}

export { acknowledgePolicy };
