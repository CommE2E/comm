// @flow

import * as React from 'react';
import { useDispatch } from 'react-redux';

import { logIn } from '../actions/user-actions.js';
import type { LogInInfo, LogInResult } from '../types/account-types.js';
import { forcePolicyAcknowledgmentActionType } from '../types/policy-types.js';
import { useServerCall } from '../utils/action-utils.js';

function useLogInServerCall(): (logInInfo: LogInInfo) => Promise<LogInResult> {
  const dispatch = useDispatch();
  const callLogIn = useServerCall(logIn);

  return React.useCallback(
    async (logInInfo: LogInInfo) => {
      const result = await callLogIn(logInInfo);
      if (
        result.notAcknowledgedPolicies &&
        result.notAcknowledgedPolicies.length
      ) {
        dispatch({
          type: forcePolicyAcknowledgmentActionType,
          payload: {
            notAcknowledgedPolicies: result.notAcknowledgedPolicies,
          },
        });
      }
      return result;
    },
    [callLogIn, dispatch],
  );
}

export { useLogInServerCall };
